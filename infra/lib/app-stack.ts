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

const DB_USER = 'app';
const DB_NAME = 'app';
const APP_PORT = 80;

// Parâmetros SecureString criados por infra/scripts/setup-secrets.sh.
const DB_PASSWORD_PARAM = '/grupo02/db-password';
const JWT_SECRET_PARAM = '/grupo02/jwt-secret';
const INTERNAL_API_KEY_PARAM = '/grupo02/internal-api-key';
const NVIDIA_KEY_CLASSIFIER_PARAM = '/grupo02/nvidia-key-classifier';
const NVIDIA_KEY_SUMMARIZER_PARAM = '/grupo02/nvidia-key-summarizer';

// Perfil de inferência do Bedrock em us-east-1.
const LLM_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // VPC existente na conta; subnets públicas, pois não há NAT.
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
            vpcId: this.node.getContext('vpcId'),
            availabilityZones: this.node.getContext('availabilityZones'),
            publicSubnetIds: this.node.getContext('publicSubnetIds'),
        });
        const subnets: ec2.SubnetSelection = { subnetType: ec2.SubnetType.PUBLIC };

        const logGroup = new logs.LogGroup(this, 'Logs', {
            logGroupName: '/grupo02/app',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const fileSystem = new efs.FileSystem(this, 'PgData', {
            vpc,
            vpcSubnets: subnets,
            encrypted: true,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        // uid/gid 70 = usuário postgres da imagem alpine.
        const accessPoint = fileSystem.addAccessPoint('PgDataAccessPoint', {
            path: '/postgres',
            posixUser: { uid: '70', gid: '70' },
            createAcl: { ownerUid: '70', ownerGid: '70', permissions: '750' },
        });

        const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

        const taskDefinition = new ecs.FargateTaskDefinition(this, 'Task', {
            cpu: 1024,
            memoryLimitMiB: 2048,
            runtimePlatform: {
                // ARM: em x86 o build precisaria de emulação, e o esbuild do web trava emulado.
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
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
        const internalApiKey = ecs.Secret.fromSsmParameter(
            ssm.StringParameter.fromSecureStringParameterAttributes(this, 'InternalApiKey', { parameterName: INTERNAL_API_KEY_PARAM }),
        );
        const nvidiaKeyClassifier = ecs.Secret.fromSsmParameter(
            ssm.StringParameter.fromSecureStringParameterAttributes(this, 'NvidiaKeyClassifier', { parameterName: NVIDIA_KEY_CLASSIFIER_PARAM }),
        );
        const nvidiaKeySummarizer = ecs.Secret.fromSsmParameter(
            ssm.StringParameter.fromSecureStringParameterAttributes(this, 'NvidiaKeySummarizer', { parameterName: NVIDIA_KEY_SUMMARIZER_PARAM }),
        );

        const postgres = taskDefinition.addContainer('postgres', {
            image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/postgres:16-alpine'),
            essential: true,
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

        const api = taskDefinition.addContainer('api', {
            image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../..'), {
                file: 'infra/docker/app.Dockerfile',
                platform: Platform.LINUX_ARM64,
            }),
            essential: true,
            portMappings: [{ containerPort: APP_PORT }],
            environment: {
                DB_HOST: 'localhost',
                DB_PORT: '5432',
                DB_USER,
                DB_NAME,
                DB_SYNCHRONIZE: 'true',
                AWS_REGION: this.region,
                AI_SERVICE_URL: 'http://localhost:8000',
            },
            secrets: { DB_PASSWORD: dbPassword, JWT_SECRET: jwtSecret, INTERNAL_API_KEY: internalApiKey },
            logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'api' }),
        });
        api.addContainerDependencies({ container: postgres, condition: ecs.ContainerDependencyCondition.HEALTHY });

        const copiloto = taskDefinition.addContainer('copiloto', {
            image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../ai'), { platform: Platform.LINUX_ARM64 }),
            command: ['uvicorn', 'servidor:app', '--host', '0.0.0.0', '--port', '8000'],
            // Se cair, a api responde o chat por palavra-chave.
            essential: false,
            enableRestartPolicy: true,
            environment: {
                API_URL: `http://localhost:${APP_PORT}/api`,
                AWS_REGION: this.region,
                BEDROCK_MODEL_ID: LLM_MODEL_ID,
                // Para usar o Titan nos embeddings (infra/README.md, passo 8):
                // BEDROCK_EMBEDDING_MODEL_ID: 'amazon.titan-embed-text-v2:0',
            },
            secrets: {
                INTERNAL_API_KEY: internalApiKey,
                NVIDIA_KEY_CLASSIFIER: nvidiaKeyClassifier,
                NVIDIA_KEY_SUMMARIZER: nvidiaKeySummarizer,
            },
            logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'copiloto' }),
        });
        copiloto.addContainerDependencies({ container: api, condition: ecs.ContainerDependencyCondition.START });

        const service = new ecs.FargateService(this, 'Service', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: true,
            vpcSubnets: subnets,
            // Nunca dois Postgres no mesmo disco: a task antiga cai antes de a nova subir.
            minHealthyPercent: 0,
            maxHealthyPercent: 100,
            circuitBreaker: { rollback: true },
            enableExecuteCommand: true,
        });

        service.connections.allowFromAnyIpv4(ec2.Port.tcp(APP_PORT), 'Acesso publico a api/web');
        fileSystem.connections.allowDefaultPortFrom(service, 'Task acessa o disco do Postgres');

        // A URL não sai daqui: o IP público muda a cada task (infra/scripts/url.sh).
        new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName });
        new cdk.CfnOutput(this, 'ServiceName', { value: service.serviceName });
        new cdk.CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
    }
}
