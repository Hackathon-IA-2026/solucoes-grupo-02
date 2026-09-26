import { TAXONOMIA } from '../alerta/taxonomia';
import { FONTES, lerGovBr, lerRss, setoresDaNoticia } from './coleta';

// Recortes do que os sites devolviam em 26/09/2026.
const RSS = `<rss><channel>
<item>
  <title>No Senado, ABSOLAR destaca o papel da fonte solar e do armazenamento</title>
  <link>https://www.absolar.org.br/giro-absolar/no-senado</link>
  <pubDate>Tue, 11 Aug 2026 19:52:37 +0000</pubDate>
  <category><![CDATA[Giro Absolar]]></category>
  <description><![CDATA[Home Foto: TV Senado O Presidente Executivo da ABSOLAR...]]></description>
  <content:encoded><![CDATA[<nav>Home</nav><figure><img src="https://www.absolar.org.br/wp-content/uploads/2026/08/Giro-5.png" /></figure>
  <p class="wp-block-paragraph">Foto: TV Senado</p>
  <p class="wp-block-paragraph">O Presidente Executivo da ABSOLAR, Rodrigo Sauaia, participou da sess&#227;o &#8220;Pot&#234;ncia&#8221;.</p>
  <p>O post <a href="x">No Senado</a> apareceu primeiro em <a href="y">ABSOLAR</a>.</p>]]></content:encoded>
</item>
<item>
  <title>Conta de luz terá bandeira verde em outubro</title>
  <link>https://megawhat.uol.com.br/distribuicao/bandeira-verde/</link>
  <pubDate>Fri, 25 Sep 2026 20:04:53 +0000</pubDate>
  <description><![CDATA[<div><figure><img src="https://megawhat.uol.com.br/foto.jpg" alt=""/><figcaption>Foto: Bravo Energia</figcaption></figure></div><p>A Aneel acionou a bandeira verde.</p>]]></description>
  <media:content url="https://megawhat.uol.com.br/foto.jpg" medium="image" />
</item>
<item><title>Sem link</title></item>
</channel></rss>`;

const GOVBR = `<ul class="noticias listagem-noticias-com-foto"> <li> <div class="conteudo"> <div class="subtitulo-noticia">Leilões</div>
  <h2 class="titulo"> <a href="https://www.gov.br/aneel/pt-br/assuntos/noticias/2026/leilao-de-baterias">Leilão marcado para abril de 2027, o primeiro com contratação de baterias</a> </h2>
  <div class="imagem mobile"> <img class="newsImage" src="https://www.gov.br/aneel/foto.jpg/@@images/image/mini" alt="" /> </div>
  <span class="descricao"> <span class="data"> 08/09/2026 </span> <span> - </span> ANEEL espera investimento de R$ 12,9 bilhões </span> </div> </li> </ul>`;

describe('lerRss', () => {
    const [absolar, megawhat, ...resto] = lerRss(RSS);

    it('lê título, link, data, imagem e categorias', () => {
        expect(absolar).toMatchObject({
            titulo: 'No Senado, ABSOLAR destaca o papel da fonte solar e do armazenamento',
            url: 'https://www.absolar.org.br/giro-absolar/no-senado',
            publicadoEm: '2026-08-11',
            imageUrl: 'https://www.absolar.org.br/wp-content/uploads/2026/08/Giro-5.png',
            categorias: 'Giro Absolar',
        });
        expect(megawhat.imageUrl).toBe('https://megawhat.uol.com.br/foto.jpg');
    });

    it('monta o resumo pelos parágrafos, sem menu, crédito de foto nem rodapé do WordPress', () => {
        expect(absolar.resumo).toBe('O Presidente Executivo da ABSOLAR, Rodrigo Sauaia, participou da sessão “Potência”.');
        expect(megawhat.resumo).toBe('A Aneel acionou a bandeira verde.');
    });

    it('ignora item sem link', () => {
        expect(resto).toEqual([]);
    });
});

describe('lerGovBr', () => {
    it('lê a listagem de notícias da ANEEL/MME', () => {
        expect(lerGovBr(GOVBR)).toEqual([
            {
                titulo: 'Leilão marcado para abril de 2027, o primeiro com contratação de baterias',
                resumo: 'ANEEL espera investimento de R$ 12,9 bilhões',
                url: 'https://www.gov.br/aneel/pt-br/assuntos/noticias/2026/leilao-de-baterias',
                imageUrl: 'https://www.gov.br/aneel/foto.jpg/@@images/image/mini',
                publicadoEm: '2026-09-08',
                categorias: 'Leilões',
            },
        ]);
    });
});

describe('setoresDaNoticia', () => {
    it('acha as áreas por palavra-chave, sem acento e sem pegar pedaço de palavra', () => {
        expect(setoresDaNoticia('Baterias podem reduzir curtailment em até 50%')).toEqual(['Solar', 'Eólica', 'Armazenamento']);
        expect(setoresDaNoticia('Energia injetada por MMGD na rede')).toEqual(['Solar']);
        expect(setoresDaNoticia('EÓLICA OFFSHORE: publicada metodologia')).toEqual(['Eólica']);
        expect(setoresDaNoticia('Conta de luz terá bandeira verde em outubro')).toEqual([]);
        expect(setoresDaNoticia('Agenda de consolidação regulatória')).toEqual([]); // "gd" dentro de outra palavra não conta
    });

    it('soma as áreas fixas da fonte', () => {
        expect(setoresDaNoticia('ONS projeta alta de 3,6% na carga', ['Solar'])).toEqual(['Solar']);
    });

    it('só usa áreas da taxonomia', () => {
        const areas = Object.keys(TAXONOMIA);
        expect(FONTES.flatMap((f) => f.setores).every((s) => areas.includes(s))).toBe(true);
        expect(setoresDaNoticia('solar eólica bateria').every((s) => areas.includes(s))).toBe(true);
    });
});
