import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';

// Nomes fixos: aparecem no console e nos scripts de infra/scripts/.
const DB_USER = 'app';
const DB_NAME = 'app';
const APP_PORT = 80;

// Segredos criados à mão na sexta com infra/scripts/setup-secrets.sh (o CloudFormation
// não cria parâmetros SecureString, e o Secrets Manager não está liberado no hackathon).
const DB_PASSWORD_PARAM = '/grupo02/db-password';
const JWT_SECRET_PARAM = '/grupo02/jwt-secret';

/**
 * Tudo o que roda na AWS:
 *
 *   Navegador ──:80──▶ Task Fargate (IP público)
 *                        ├─ container "api"      NestJS + build do web (infra/docker/app.Dockerfile)
 *                        └─ container "postgres" fala com a api por localhost:5432
 *                                 └─ dados em um disco EFS, que sobrevive a reinícios da task
 *
 * Não há load balancer nem RDS porque esses serviços não estão liberados no hackathon.
 */
export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ── Rede ────────────────────────────────────────────────────────────
        // Não criamos VPC (não temos permissão): importamos a que já existe na conta.
        // Os IDs vêm do cdk.json. Precisam ser subnets PÚBLICAS: sem NAT, é o IP público
        // que deixa a task baixar imagens, falar com o Bedrock e receber acesso do navegador.
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
            vpcId: this.node.getContext('vpcId'),
            availabilityZones: this.node.getContext('availabilityZones'),
            publicSubnetIds: this.node.getContext('publicSubnetIds'),
        });
        const subnets: ec2.SubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };

        // ── Logs ────────────────────────────────────────────────────────────
        // Todo console.log da api e todo log do Postgres chegam aqui.
        // Para acompanhar ao vivo: infra/scripts/logs.sh
        const logGroup = new logs.LogGroup(this, 'Logs', {
            logGroupName: '/grupo02/app',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // ── Disco do banco (EFS) ────────────────────────────────────────────
        // Um disco de rede. A task pode morrer e renascer em outra máquina; o disco continua.
        // RETAIN: um `cdk destroy` NÃO apaga o disco (proteção contra perder os dados no sábado).
        // O disco que sobra fica órfão e precisa ser apagado à mão no console, se quiser.
        const fileSystem = new efs.FileSystem(this, 'PgData', {
            vpc,
            vpcSubnets: subnets,
            encrypted: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        // O "access point" é uma pasta dentro do disco com dono fixo: uid/gid 70 é o usuário
        // `postgres` na imagem alpine. Sem isso, o Postgres recusa a pasta por ter outro dono.
        const accessPoint = fileSystem.addAccessPoint('PgDataAccessPoint', {
            path: '/postgres',
            posixUser: { uid: '70', gid: '70' },
            createAcl: { ownerUid: '70', ownerGid: '70', permissions: '750' },
        });

        // ── Cluster e definição da task ─────────────────────────────────────
        // Cluster = agrupamento lógico. Com Fargate não existem máquinas para gerenciar.
        const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

        // Task definition = a "receita" da task: CPU, memória, containers, volumes.
        // A CDK cria dois roles aqui (e o hackathon permite entregar roles nossos ao ECS):
        //   - execution role: usado pelo ECS para baixar a imagem, ler os segredos e gravar logs
        //   - task role:      usado pelo NOSSO código (Bedrock, EFS, S3...)
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'Task', {
            cpu: 512, // 0,5 vCPU, somando os dois containers
            memoryLimitMiB: 1024,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.X86_64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
            },
            volumes: [
                {
                    name: 'pgdata',
                    efsVolumeConfiguration: {
                        fileSystemId: fileSystem.fileSystemId,
                        transitEncryption: 'ENABLED',
                        authorizationConfig: { accessPointId: accessPoint.accessPointId, iam: 'ENABLED' },
                    },
                },
            ],
        });
        fileSystem.grantReadWrite(taskDefinition.taskRole);

        // Para o copiloto chamar modelos do Bedrock a partir da api.
        taskDefinition.addToTaskRolePolicy(
            new iam.PolicyStatement({
                actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:Converse', 'bedrock:ConverseStream'],
                resources: ['*'],
            }),
        );

        const dbPassword = ecs.Secret.fromSsmParameter(
            ssm.StringParameter.fromSecureStringParameterAttributes(this, 'DbPassword', { parameterName: DB_PASSWORD_PARAM }),
        );
        const jwtSecret = ecs.Secret.fromSsmParameter(
            ssm.StringParameter.fromSecureStringParameterAttributes(this, 'JwtSecret', { parameterName: JWT_SECRET_PARAM }),
        );

        // ── Container: Postgres ─────────────────────────────────────────────
        // Imagem oficial via ECR Public: só download, não precisa de push.
        const postgres = taskDefinition.addContainer('postgres', {
            image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/postgres:16-alpine'),
            essential: true, // se o banco morrer, a task inteira reinicia
            environment: {
                POSTGRES_USER: DB_USER,
                POSTGRES_DB: DB_NAME,
                // Subpasta: o initdb exige criar a pasta de dados ele mesmo.
                PGDATA: '/var/lib/postgresql/data/pgdata',
            },
            secrets: { POSTGRES_PASSWORD: dbPassword },
            healthCheck: {
                command: ['CMD-SHELL', `pg_isready -U ${DB_USER} -d ${DB_NAME}`],
                interval: cdk.Duration.seconds(10),
                timeout: cdk.Duration.seconds(5),
                retries: 5,
                startPeriod: cdk.Duration.seconds(30),
            },
            logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'postgres' }),
        });
        postgres.addMountPoints({ sourceVolume: 'pgdata', containerPath: '/var/lib/postgresql/data', readOnly: false });

        // ── Container: api + web ────────────────────────────────────────────
        // fromAsset: o `cdk deploy` faz o `docker build` na máquina de quem roda o comando
        // e envia a imagem para o ECR do bootstrap da CDK (pelo role cdk-*-image-publishing).
        const api = taskDefinition.addContainer('api', {
            image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../..'), {
                file: 'infra/docker/app.Dockerfile',
                platform: Platform.LINUX_AMD64,
            }),
            essential: true,
            portMappings: [{ containerPort: APP_PORT }],
            environment: {
                // Os dois containers da mesma task compartilham a rede: o banco está em localhost.
                DB_HOST: 'localhost',
                DB_PORT: '5432',
                DB_USER,
                DB_NAME,
                // Não há migrations no repo: o TypeORM cria/ajusta as tabelas ao subir.
                DB_SYNCHRONIZE: 'true',
                AWS_REGION: this.region,
            },
            secrets: { DB_PASSWORD: dbPassword, JWT_SECRET: jwtSecret },
            logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'api' }),
        });
        // Só inicia a api depois que o Postgres responder ao health check.
        api.addContainerDependencies({ container: postgres, condition: ecs.ContainerDependencyCondition.HEALTHY });

        // ── Service ─────────────────────────────────────────────────────────
        // O service mantém a task rodando: se ela morrer, o ECS sobe outra.
        const service = new ecs.FargateService(this, 'Service', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: true,
            vpcSubnets: subnets,
            // CRÍTICO: nunca dois Postgres no mesmo disco. No redeploy o ECS primeiro derruba
            // a task antiga (min 0%) e só então sobe a nova (max 100%). Fica ~1-2 min fora do ar.
            minHealthyPercent: 0,
            maxHealthyPercent: 100,
            // Se a task nova não subir, o deploy falha em minutos (em vez de travar por horas)
            // e volta para a versão anterior.
            circuitBreaker: { rollback: true },
            // Permite abrir um terminal dentro do container: infra/scripts/shell.sh
            enableExecuteCommand: true,
        });

        // Security groups (o "firewall" de cada recurso):
        //   internet → api na porta 80
        //   task     → EFS na porta 2049 (NFS)
        service.connections.allowFromAnyIpv4(ec2.Port.tcp(APP_PORT), 'Acesso publico a api/web');
        fileSystem.connections.allowDefaultPortFrom(service, 'Task acessa o disco do Postgres');

        // Aparecem no fim do `cdk deploy`. A URL não sai daqui: o IP público muda a cada task
        // nova, então é consultado na hora com infra/scripts/url.sh
        new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName });
        new cdk.CfnOutput(this, 'ServiceName', { value: service.serviceName });
        new cdk.CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
    }
}
