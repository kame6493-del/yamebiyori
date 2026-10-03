/**
 * 体の変化・乗り切り方の情報。すべて公的な出典の原文をそのまま載せる(言い換え・要約をしない)。
 * e-ヘルスネットの利用条件: 「改変のない原文の状態で出典を明記することにより、…自由に利用いただけます」
 *   (https://kennet.mhlw.go.jp/ の「コンテンツの利用について」/ 公共データ利用規約 第1.0版。商用利用も可)
 * 出典の書き方は同サイトの例「出典：「○○」（厚生労働省健康づくりサポートネット）（URL）」と執筆者名に合わせる。
 * アプリが自分で書いた文(個人差の注意など)は、原文と見分けがつくよう別の欄に置く。
 */
import type { HabitKind } from './types';

export interface Source {
  title: string;
  site: string;
  url: string;
  author?: string;
  date: string; // 最終更新日 または 最終確認日(原文の表記)
}

const KENNET = '厚生労働省健康づくりサポートネット(e-ヘルスネット)';

export const SRC = {
  tobaccoEffect: { title: '禁煙の効果', site: KENNET, url: 'https://kennet.mhlw.go.jp/information/information/tobacco/t-08-001.html', author: '中村 正和', date: '最終更新日 2025年10月15日' },
  tobaccoEarly: { title: '禁煙開始からまだ間もない方へ《実行期編》', site: KENNET, url: 'https://kennet.mhlw.go.jp/information/information/tobacco/t-06-003.html', author: '谷口 千枝', date: '最終更新日 2018年10月03日' },
  tobaccoPrep: { title: '禁煙の準備 – 禁煙7日前から行う、禁煙のコツを教えます！《準備編》', site: KENNET, url: 'https://kennet.mhlw.go.jp/information/information/tobacco/t-06-002.html', author: '谷口 千枝', date: '最終確認日 2021年11月10日' },
  liver: { title: 'アルコールと肝臓病', site: KENNET, url: 'https://kennet.mhlw.go.jp/information/information/alcohol/a-01-002.html', author: '横山 顕', date: '最終更新日 2022年12月26日' },
  cancer: { title: 'アルコールとがん', site: KENNET, url: 'https://kennet.mhlw.go.jp/information/information/alcohol/a-01-008.html', author: '横山 顕', date: '最終更新日 2025年10月15日' },
  dependence: { title: 'アルコールと依存', site: KENNET, url: 'https://kennet.mhlw.go.jp/information/information/alcohol/a-05-001.html', author: '木村 充', date: '最終更新日 2020年06月24日' },
  guideline: { title: '健康に配慮した飲酒に関するガイドライン', site: '厚生労働省', url: 'https://www.mhlw.go.jp/stf/newpage_38541.html', date: '2026年10月3日に利用' },
} satisfies Record<string, Source>;

export function citeText(s: Source): string {
  return `出典:「${s.title}」(${s.site})${s.author ? ` 執筆 ${s.author}` : ''} ${s.url}`;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const YEAR = 365 * DAY;

/** 禁煙後の経過。表の行をそのまま(左の欄=time, 右の欄=lines) */
export interface TimelineRow { time: string; atMs: number; lines: string[] }

export const TOBACCO_TIMELINE: { source: Source; intro: string; rows: TimelineRow[] } = {
  source: SRC.tobaccoEarly,
  intro: '禁煙開始後20分から身体的な禁煙の効果は出現します。例えば血圧や脈拍が正常に戻ったり、手足の血のめぐりがよくなったりします。また継続して禁煙していくことで、呼吸がラクになったり味覚が戻ってきたりします。',
  rows: [
    { time: '禁煙後20分', atMs: 20 * MIN, lines: ['血圧や脈拍が正常化する'] },
    { time: '12時間', atMs: 12 * HOUR, lines: ['血液中の一酸化炭素が正常になる'] },
    { time: '2-3週間', atMs: 14 * DAY, lines: ['心機能が改善する / 肺機能が回復する'] },
    { time: '1-9ヶ月', atMs: 30 * DAY, lines: ['咳・息切れ・疲れやすさが改善される'] },
    { time: '1年', atMs: YEAR, lines: ['上昇していた冠動脈疾患のリスクが半減する'] },
    { time: '5年', atMs: 5 * YEAR, lines: ['脳卒中のリスクが非喫煙者と同じレベルになる'] },
    { time: '10年', atMs: 10 * YEAR, lines: ['肺がん死亡率が喫煙者の半分になる', '口腔・喉頭・食道・膵臓・膀胱・子宮頸がんになるリスクが低下する'] },
    { time: '15年', atMs: 15 * YEAR, lines: ['冠動脈疾患のリスクが非喫煙者と同じレベルになる'] },
  ],
};

/** 原文の一節(段落ごと・文の途中で切らない) */
export interface Quote { heading: string; text: string; source: Source }

export const QUOTES: Record<'smoke' | 'alcohol', Quote[]> = {
  smoke: [
    { heading: '遅すぎることはない', text: '長年たばこを吸っていても、禁煙するのに遅すぎることはありません。', source: SRC.tobaccoEffect },
    { heading: '早い時期の変化', text: '禁煙後早ければ1ヵ月たつと、せきや喘鳴（ぜんめい）などの呼吸器症状が改善します。また、免疫機能が回復して、かぜやインフルエンザなどの感染症にかかりにくくなります。', source: SRC.tobaccoEffect },
    { heading: '暮らしの中の変化', text: 'そのほか、禁煙すると顔色や胃の調子が良くなったり目覚めがさわやかになるなど、日常生活の中で実感できる色々な効果があります。', source: SRC.tobaccoEffect },
  ],
  alcohol: [
    { heading: '脂肪肝', text: '飲酒が原因の脂肪肝は、飲酒をやめれば短期間で改善するのが特徴です。', source: SRC.liver },
    { heading: '肝臓と禁酒の年数', text: 'アルコール性肝障害は禁酒により再生へ向かい、禁酒1年につき肝臓がんのリスクは6-7%低下します。', source: SRC.liver },
    { heading: 'がんのリスク', text: '頭頸部がん、食道がん、肝臓がんでは禁酒により最初のがんや2つ目のがんの発生リスクが低下することが報告されており、禁煙・禁酒・野菜や果物の摂取に取り組めばさらにリスクは低下します。', source: SRC.cancer },
  ],
};

/** やめ始めに必ず目に入れておく注意(原文) */
export const CAUTION: Record<'smoke' | 'alcohol', Quote> = {
  alcohol: {
    heading: '急にやめたときの体の症状',
    text: '身体依存とは、文字通り酒が切れると身体の症状が出ることで、酒を止めたり減らしたりしたときに、離脱症状と呼ばれる症状が出現するようになります。代表的な離脱症状としては、不眠・発汗・手のふるえ・血圧の上昇・不安・いらいら感などがあり、重症の場合は幻覚が見えたり、けいれん発作を起こしたりすることもあります。',
    source: SRC.dependence,
  },
  smoke: {
    heading: 'はじめの2週間が山場',
    text: '禁煙開始後2～3日をピークに禁煙の離脱症状（禁断症状）が現れます。その後個人差はありますが、症状は緩やかに10～14日ごろまで続きます。',
    source: SRC.tobaccoPrep,
  },
};

/** 吸いたい気持ちの長さ(タイマーの根拠。たばこ版だけで使う) */
export const CRAVE_LENGTH: Quote = {
  heading: '吸いたい気持ちは続かない',
  text: 'たばこを吸いたい気持ちは1日中ずっと続くわけではありません。長く続いても3分～5分です。',
  source: SRC.tobaccoPrep,
};

/** 吸いたくなる場面と代わりになる行動(原文の表のまま) */
export const TOBACCO_ALTERNATIVES: { source: Source; rows: [string, string][] } = {
  source: SRC.tobaccoPrep,
  rows: [
    ['朝起きてすぐ', 'すぐに顔を洗う'],
    ['食事の後', '歯磨き'],
    ['コーヒーと一緒に', 'コーヒーを紅茶に代える'],
    ['出勤中の車の中', '大声で歌う'],
    ['仕事の休憩時間', '職場の人に禁煙宣言をする'],
    ['帰宅時の車の中', '深呼吸'],
    ['アルコールとともに', '冷水を一緒に置いておき、吸いたくなったら飲む'],
  ],
};

/** 量を減らすときの工夫(ガイドラインの見出しのまま。減酒・飲んでしまった日に見せる) */
export const ALCOHOL_TIPS: { source: Source; lead: string; items: string[] } = {
  source: SRC.guideline,
  lead: '飲酒をする場合においても、様々な危険を避けるために、例えば、以下のような配慮等をすることが考えられます。',
  items: [
    '自らの飲酒状況等を把握する',
    'あらかじめ量を決めて飲酒をする',
    '飲酒前又は飲酒中に食事をとる',
    '飲酒の合間に水（又は炭酸水）を飲むなど、アルコールをゆっくり分解・吸収できるようにする（水などを混ぜてアルコール度数を低くして飲酒をする、少しずつ飲酒する、アルコールの入っていない飲み物を選ぶなど）',
    '一週間のうち、飲酒をしない日を設ける（毎日飲み続けるといった継続しての飲酒を避ける）',
  ],
};

/** アプリが自分で書いた注意(出典の言葉ではない) */
export const APP_NOTE = 'このアプリは記録のための道具で、医療の助言や診断はしません。体の変化には個人差があります。体調に不安があるとき、つらい症状が出たときは、ためらわず医療機関に相談してください。出典の内容を厚生労働省が本アプリのために示したものではありません。';

/** 経過した時間までに過ぎた行と、次の行 */
export function timelineProgress(elapsedMs: number): { reached: number; next: TimelineRow | null } {
  const rows = TOBACCO_TIMELINE.rows;
  const reached = rows.filter((r) => elapsedMs >= r.atMs).length;
  return { reached, next: rows[reached] ?? null };
}

export function quotesFor(kind: HabitKind): Quote[] {
  return kind === 'custom' ? [] : QUOTES[kind];
}
