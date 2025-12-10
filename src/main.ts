import { MainSettingTab } from "src/settings";
import * as translations from "src/translations.json";
import { moment, Notice } from "obsidian";
import { fetchVerse } from "src/quotation";

import { App, Editor, MarkdownView, Modal, Plugin } from "obsidian";

interface PluginSettings {
	pluginLanguage: string;
	bibleEdition: string;
	expandBibleBookName: boolean;
	capitalizeFirstCharBibleBookName: boolean;
	addSpaceAfterBibleBookNumber: boolean;
	autoGetLine: boolean;
	autoOpenLink: boolean;
	insertQuote: boolean;
	showQuotationVerse: boolean;
	quotationPrefix: string;
	quotationSuffix: string;
	makeBold: boolean;
	makeItalic: boolean;
	linkPrefix: string;
	linkSuffix: string;
	lastVersion: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	pluginLanguage: "?",
	bibleEdition: "nwtsty",
	expandBibleBookName: true,
	capitalizeFirstCharBibleBookName: true,
	addSpaceAfterBibleBookNumber: true,
	autoGetLine: false,
	autoOpenLink: false,
	insertQuote: false,
	showQuotationVerse: true,
	quotationPrefix: ">",
	quotationSuffix: "",
	makeBold: false,
	makeItalic: false,
	linkPrefix: "",
	linkSuffix: "",
	lastVersion: "",
};

enum EditorAction {
	OpenUrl,
	InsertUrl,
	InsertQuotation,
}

const translationsTyped: { [key: string]: { [key: string]: string } } =
	translations;

export default class NwtLinker extends Plugin {
	settings: PluginSettings;

	//Set current plugin version
	currentPluginVersion = this.manifest.version;

	//Function to get a translation of a given key if available in the selected language
	getTranslation(key: string) {
		const langBase = this.getLangBase();
		const attemptTranslating =
			typeof langBase[key] !== "undefined" ? langBase[key] : undefined;
		if (typeof attemptTranslating !== "undefined") {
			return attemptTranslating;
		}
		return key;
	}

	getLangBase(): { [key: string]: string } {
		const pluginLanguage = this.settings.pluginLanguage;
		const langBase: { [key: string]: string } =
			Object.prototype.hasOwnProperty.call(
				translationsTyped,
				pluginLanguage,
			)
				? translationsTyped[pluginLanguage]
				: {};

		return langBase;
	}

	async onload() {
		await this.loadSettings();

		console.debug("NWT linker v." + this.currentPluginVersion);

		if (this.settings.pluginLanguage == "?") {
			if (
				Object.prototype.hasOwnProperty.call(
					translationsTyped,
					moment.locale(),
				)
			) {
				this.settings.pluginLanguage = moment.locale();
			} else {
				this.settings.pluginLanguage = "en";
			}
		}

		await this.saveSettings();

		const errorModal = new ErrorModal(this.app);

		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu, editor, view: MarkdownView) => {
					menu.addItem((item) => {
						// eslint-disable-next-line obsidianmd/ui/sentence-case -- This contains the name of an external application
						item.setTitle("Convert Bible text to JW Library link")
							.setIcon("link")
							.onClick(async () => {
								await convertBibleTextToJWLibraryLink(
									editor,
									EditorAction.InsertUrl,
								);
							});
					});
				},
			),
		);

		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu, editor, view: MarkdownView) => {
					menu.addItem((item) => {
						// eslint-disable-next-line obsidianmd/ui/sentence-case -- This contains the name of an external application
						item.setTitle("Open Bible text in JW Library")
							.setIcon("link")
							.onClick(async () => {
								await convertBibleTextToJWLibraryLink(
									editor,
									EditorAction.OpenUrl,
								);
							});
					});
				},
			),
		);
		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu, editor, view: MarkdownView) => {
					menu.addItem((item) => {
						// eslint-disable-next-line obsidianmd/ui/sentence-case -- This contains the name of a Book's title therefore should be capitalized
						item.setTitle("Insert quotation from Bible")
							.setIcon("link")
							.onClick(async () => {
								await convertBibleTextToJWLibraryLink(
									editor,
									EditorAction.InsertQuotation,
								);
							});
					});
				},
			),
		);

		const insertBibleQuotation = async (
			editor: Editor,
			linkOutput: string,
			jwEndpoint: string,
		) => {
			const cur = editor.getCursor(); // { line, ch }
			const lineLen = editor.getLine(cur.line).length;
			let text;
			try {
				// Insert a newline at end of current line, then move cursor to new empty line
				text = await fetchVerse(
					linkOutput,
					this.settings.showQuotationVerse,
					jwEndpoint,
				);
				editor.replaceRange(
					"\n" +
						this.settings.quotationPrefix +
						text +
						this.settings.quotationSuffix +
						"\n",
					{
						line: cur.line,
						ch: lineLen,
					},
				);
			} catch {
				new Notice(this.getTranslation("FETCH_ERROR"));
			}
		};

		const convertBibleTextToJWLibraryLink = async (
			editor: Editor,
			action: EditorAction,
		) => {
			let input;
			try {
				if (this.settings.autoGetLine) {
					if (editor.getSelection().length > 0) {
						input = editor.getSelection();
					} else {
						input = editor.getLine(editor.getCursor().line);
						editor.setLine(editor.getCursor().line, "");
					}
				} else {
					input = editor.getSelection();
				}

				input = input.trim();

				const wtLocaleEN = "E";
				const jwEndpointEN =
					"https://www.jw.org/en/library/bible/study-bible/books/json/html/";
				const bibleBooksEN = [
					["ge", "gen", "genesis"],
					["ex", "exodus"],
					["le", "lev", "leviticus"],
					["nu", "num", "numbers"],
					["de", "deut", "deuteronomy"],
					["jos", "josh", "joshua"],
					["jg", "judg", "judges"],
					["ru", "ruth"],
					["1sa", "1sam", "1samuel"],
					["2sa", "2sam", "2samuel"],
					["1ki", "1kings"],
					["2ki", "2kings"],
					["1ch", "1chron", "1chronicles"],
					["2ch", "2chron", "2chronicles"],
					["ezr", "ezra"],
					["ne", "neh", "nehemiah"],
					["es", "esther"],
					["job", "job"],
					["ps", "psalms", "psalm"],
					["pr", "prov", "proverbs"],
					["ec", "eccl", "ecclesiastes"],
					["ca", "song of sol", "song of solomon"],
					["isa", "isa", "isaiah"],
					["jer", "jer", "jeremiah"],
					["la", "lam", "lamentations"],
					["eze", "ezek", "ezekiel"],
					["da", "dan", "daniel"],
					["ho", "hos", "hosea"],
					["joe", "joel"],
					["am", "amos"],
					["ob", "obad", "obadiah"],
					["jon", "jonah"],
					["mic", "mic", "micah"],
					["na", "nah", "nahum"],
					["hab", "habakkuk"],
					["zep", "zeph", "zephaniah"],
					["hag", "haggaï"],
					["zec", "zech", "zechariah"],
					["mal", "malachi"],
					["mt", "matt", "matthew"],
					["mr", "mark", "mark"],
					["lu", "luke"],
					["joh", "john"],
					["ac", "acts"],
					["ro", "rom", "romans"],
					["1co", "1cor", "1corinthians"],
					["2co", "2cor", "2corinthians"],
					["ga", "gal", "galatians"],
					["eph", "ephesians"],
					["php", "phil", "philippians"],
					["col", "kolossenzen", "colossians"],
					["1th", "1thess", "1thessalonians"],
					["2th", "2thess", "2thessalonians"],
					["1ti", "1tim", "1timothy"],
					["2ti", "2tim", "2timothy"],
					["tit", "titus"],
					["phm", "philem", "philemon"],
					["heb", "hebr", "hebrews"],
					["jas", "james"],
					["1pe", "1pet", "1peter"],
					["2pe", "2pet", "2peter"],
					["1jo", "1john"],
					["2jo", "2john"],
					["3jo", "3john"],
					["jude", "jude"],
					["re", "rev", "revelation"],
				];

				const wtLocaleNL = "O";
				const bibleBooksNL = [
					["ge", "gen", "genesis"],
					["ex", "exodus"],
					["le", "lev", "leviticus"],
					["nu", "num", "numeri"],
					["de", "deut", "deuteronomium"],
					["joz", "jozua"],
					["re", "recht", "rechters"],
					["ru", "ruth"],
					["1sa", "1sam", "1samuël"],
					["2sa", "2sam", "2samuël"],
					["1kon", "1koningen"],
					["2kon", "2koningen"],
					["1kr", "1kronieken"],
					["2kr", "2kronieken"],
					["ezr", "ezra"],
					["ne", "nehemia"],
					["es", "esther"],
					["job", "job"],
					["ps", "psalmen", "psalm"],
					["sp", "spreuken"],
					["pr", "pred", "prediker"],
					["hgl", "hooglied"],
					["jes", "jesaja"],
					["jer", "jeremia"],
					["klg", "klaagl", "klaagliederen"],
					["ez", "ezech", "ezechiël"],
					["da", "dan", "daniël"],
					["ho", "hos", "hosea"],
					["joë", "joël"],
					["am", "amos"],
					["ob", "obad", "obadja"],
					["jon", "jona"],
					["mi", "micha"],
					["na", "nah", "nahum"],
					["hab", "habakuk"],
					["ze", "zef", "zefanja"],
					["hag", "haggaï"],
					["za", "zach", "zacharia"],
					["mal", "maleachi"],
					["mt", "matth", "mattheüs"],
					["mr", "mark", "markus"],
					["lu", "luk", "lukas"],
					["jo", "joh", "johannes"],
					["han", "hand", "handelingen"],
					["ro", "rom", "romeinen"],
					["1kor", "1korinthiërs"],
					["2kor", "2korinthiërs"],
					["ga", "gal", "galaten"],
					["ef", "efeziërs"],
					["fil", "filippenzen"],
					["kol", "kolossenzen"],
					["1th", "1thess", "1thessalonicenzen"],
					["2th", "2thess", "2thessalonicenzen"],
					["1ti", "1tim", "1timotheüs"],
					["2ti", "2tim", "2timotheüs"],
					["tit", "titus"],
					["flm", "filem", "filemon"],
					["heb", "hebr", "hebreeën"],
					["jak", "jakobus"],
					["1pe", "1petr", "1petrus"],
					["2pe", "2petr", "2petrus"],
					["1jo", "1joh", "1johannes"],
					["2jo", "2joh", "2johannes"],
					["3jo", "3joh", "3johannes"],
					["ju", "jud", "judas"],
					["opb", "openb", "openbaring"],
				];

				const wtLocaleFR = "F";
				const bibleBooksFR = [
					["gn", "gen", "genèse"],
					["ex", "exode"],
					["lv", "lev", "lévitique"],
					["nb", "nomb", "nombres"],
					["dt", "deut", "deuteronome"],
					["jos", "jos", "josué"],
					["jg", "juges"],
					["ru", "ruth"],
					["1s", "1sam", "1samuel"],
					["2s", "2sam", "2samuel"],
					["1r", "1rois"],
					["2r", "2rois"],
					["1ch", "1chron", "1chroniques"],
					["2ch", "2chron", "2chroniques"],
					["esd", "esdras"],
					["ne", "neh", "néhémie"],
					["est", "esther"],
					["jb", "job"],
					["ps", "psaumes"],
					["pr", "prov", "proverbes"],
					["ec", "eccl", "ecclésiaste"],
					["ct", "chant de S", "Chant de Salomon"],
					["is", "isïe"],
					["jr", "jer", "jérémie"],
					["la", "lam", "lamentations"],
					["ez", "ezech", "ézechiel"],
					["da", "dan", "daniel"],
					["os", "osée"],
					["jl", "joël"],
					["am", "amos"],
					["ab", "abd", "abdias"],
					["jon", "jonas"],
					["mi", "mich", "michée"],
					["na", "nah", "nahum"],
					["hab", "habacuc"],
					["sph", "soph", "sophonie"],
					["ag", "agg", "aggée"],
					["za", "zach", "zacharie"],
					["ml", "mal", "malachie"],
					["mt", "mat", "matthieu"],
					["mc", "marc"],
					["lc", "luc"],
					["jean", "jean"],
					["ac", "actes"],
					["rm", "rom", "romains"],
					["1co", "1cor", "1corinthiens"],
					["2co", "2cor", "2corinthiens"],
					["ga", "gal", "galate"],
					["eph", "éphesiens"],
					["php", "phil", "philippiens"],
					["col", "colossiens"],
					["1th", "1thess", "1thessaloniciens"],
					["2th", "2thess", "2thessaloniciens"],
					["1tm", "1tim", "1timothée"],
					["2tm", "2tim", "2timothée"],
					["tt", "tite"],
					["phm", "philem", "philemon"],
					["he", "heb", "hébreux"],
					["jc", "jacq", "jacques"],
					["1p", "1pierre"],
					["2p", "2pierre"],
					["1j", "1jean"],
					["2j", "2jean"],
					["3j", "3jean"],
					["jude", "jude"],
					["re", "rev", "révélation"],
				];

				const wtLocalePtBr = "T";
				const bibleBooksPtBr = [
					["gên", "gênesis"],
					["êx", "êxo", "êxodo"],
					["le", "lev", "levítico"],
					["n", "núm", "números"],
					["de", "deu", "deuteronômio"],
					["jos", "josué"],
					["jz", "juí", "juízes"],
					["ru", "rute"],
					["1sa", "1sam", "1samuel"],
					["2sa", "2sam", "2samuel"],
					["1rs", "1reis"],
					["2rs", "2reis"],
					["1cr", "1crô", "1crônicas"],
					["2cr", "2crô", "2crônicas"],
					["esd", "esd", "esdras"],
					["ne", "nee", "neemias"],
					["est", "ester"],
					["jó"],
					["sal", "salmos"],
					["pr", "pro", "provérbios"],
					["ec", "ecl", "eclesiastes"],
					["cân", "cântico de salomão"],
					["is", "isa", "isaías"],
					["je", "jer", "jeremias"],
					["la", "lam", "lamentações"],
					["ez", "eze", "ezequiel"],
					["da", "dan", "daniel"],
					["os", "ose", "oseias"],
					["jl", "joel"],
					["am", "amós"],
					["ob", "obd", "obadias"],
					["jon", "jonas"],
					["miq", "miq", "miqueias"],
					["na", "naum"],
					["hab", "habacuque"],
					["sof", "sofonias"],
					["ag", "ageu"],
					["za", "zac", "zacarias"],
					["mal", "malaquias"],
					["mt", "mat", "mateus"],
					["mr", "mar", "marcos"],
					["lu", "luc", "lucas"],
					["jo", "joão"],
					["at", "atos"],
					["ro", "rom", "romanos"],
					["1co", "1cor", "1coríntios"],
					["2co", "2cor", "2coríntios"],
					["gál", "gálatas"],
					["ef", "efé", "efésios"],
					["fil", "filipenses"],
					["col", "colossenses"],
					["1te", "1tes", "1tessalonicenses"],
					["2te", "2tes", "2tessalonicenses"],
					["1ti", "1tim", "1timóteo"],
					["2ti", "2tim", "2timóteo"],
					["tit", "tito"],
					["flm", "filêm", "filêmon"],
					["he", "heb", "hebreus"],
					["tg", "tia", "tiago"],
					["1pe", "1ped", "1pedro"],
					["2pe", "2ped", "2pedro"],
					["1jo", "1joão"],
					["2jo", "2joão"],
					["3jo", "3joão"],
					["ju", "judas"],
					["ap", "apo", "apocalipse"],
				];

				const wtLocalePt = "TPO";
				const bibleBooksPt = [
					["ge", "gén", "gênesis"],
					["ex", "êx", "êxo", "êxodo"],
					["le", "lev", "levítico"],
					["n", "núm", "números"],
					["de", "deu", "deuteronómio"],
					["jos", "josué"],
					["jz", "juí", "juízes"],
					["ru", "rute"],
					["1sa", "1sam", "1samuel"],
					["2sa", "2sam", "2samuel"],
					["1rs", "1reis"],
					["2rs", "2reis"],
					["1cr", "1crô", "1crónicas"],
					["2cr", "2crô", "2crónicas"],
					["esd", "esd", "esdras"],
					["ne", "nee", "neemias"],
					["est", "ester"],
					["jó"],
					["sal", "salmos"],
					["pr", "pro", "provérbios"],
					["ec", "ecl", "eclesiastes"],
					["cân", "cântico de salomão"],
					["is", "isa", "isaías"],
					["je", "jer", "jeremias"],
					["la", "lam", "lamentações"],
					["ez", "eze", "ezequiel"],
					["da", "dan", "daniel"],
					["os", "ose", "oseias"],
					["jl", "joel"],
					["am", "amós"],
					["ob", "obd", "obadias"],
					["jon", "jonas"],
					["miq", "miq", "miqueias"],
					["na", "naum"],
					["hab", "habacuque"],
					["sof", "sofonias"],
					["ag", "ageu"],
					["za", "zac", "zacarias"],
					["mal", "malaquias"],
					["mt", "mat", "mateus"],
					["mr", "mar", "marcos"],
					["lu", "luc", "lucas"],
					["jo", "joão"],
					["at", "atos"],
					["ro", "rom", "romanos"],
					["1co", "1cor", "1coríntios"],
					["2co", "2cor", "2coríntios"],
					["gál", "gálatas"],
					["ef", "efé", "efésios"],
					["fil", "filipenses"],
					["col", "colossenses"],
					["1te", "1tes", "1tessalonicenses"],
					["2te", "2tes", "2tessalonicenses"],
					["1ti", "1tim", "1timóteo"],
					["2ti", "2tim", "2timóteo"],
					["tit", "tito"],
					["flm", "filêm", "filémon"],
					["he", "heb", "hebreus"],
					["tg", "tia", "tiago"],
					["1pe", "1ped", "1pedro"],
					["2pe", "2ped", "2pedro"],
					["1jo", "1joão"],
					["2jo", "2joão"],
					["3jo", "3joão"],
					["ju", "judas"],
					["ap", "apo", "apocalipse"],
				];

				const wtLocaleDE = "X";
				const bibleBooksDE = [
					["1mo", "1mose"],
					["2mo", "2mose"],
					["3mo", "3mose"],
					["4mo", "4mose"],
					["5mo", "5mose"],
					["jos", "josua"],
					["ri", "richter"],
					["ru", "ruth"],
					["1sam", "1samuel"],
					["2sam", "2samuel"],
					["1kö", "1könige"],
					["2kö", "2könige"],
					["1chr", "1chronika"],
					["2chr", "2chronika"],
					["es", "esra"],
					["neh", "nehemia"],
					["esth", "esther"],
					["hi", "hiob"],
					["ps", "psalmen"],
					["spr", "sprüche"],
					["pred", "prediger"],
					["hoh", "hohes lied"],
					["jes", "jesaja"],
					["jer", "jeremia"],
					["klag", "klagelieder"],
					["hes", "hesekiel"],
					["dan", "daniel"],
					["hos", "hosea"],
					["joe", "joel"],
					["am", "amos"],
					["ob", "obadja"],
					["jon", "jona"],
					["mi", "micha"],
					["nah", "nahum"],
					["hab", "habakuk"],
					["zeph", "zephanja"],
					["hag", "haggai"],
					["sach", "sacharja"],
					["mal", "maleachi"],
					["mat", "matthäus"],
					["mar", "markus"],
					["luk", "lukas"],
					["joh", "johannes"],
					["apg", "apostelgeschichte"],
					["röm", "römer"],
					["1kor", "1korinther"],
					["2kor", "2korinther"],
					["gal", "galater"],
					["eph", "epheser"],
					["phil", "philipper"],
					["kol", "kolosser"],
					["1thes", "1thessalonicher"],
					["2thes", "2thessalonicher"],
					["1tim", "1timotheus"],
					["2tim", "2timotheus"],
					["tit", "titus"],
					["phi", "philem", "philemon"],
					["heb", "hebräer"],
					["jak", "jakobus"],
					["1pet", "1petrus"],
					["2pet", "2petrus"],
					["1joh", "1johannes"],
					["2joh", "2johannes"],
					["3joh", "3johannes"],
					["jud", "judas"],
					["offb", "offenbarung"],
				];

				const wtLocaleES = "S";
				const bibleBooksES = [
					["ge", "gen", "génesis"],
					["ex", "éx", "exo", "éxodo"],
					["le", "lev", "levítico"],
					["nu", "num", "núm", "números"],
					["de", "dt", "deut", "deuteronomio"],
					["jos", "josué"],
					["jue", "juec", "jueces"],
					["ru", "rut"],
					["1sa", "1sam", "1samuel"],
					["2sa", "2sam", "2samuel"],
					["1re", "1reyes"],
					["2re", "2reyes"],
					["1cr", "1cron", "1crón", "1crónicas"],
					["2cr", "2cron", "2crón", "2crónicas"],
					["esd", "esdras"],
					["ne", "neh", "nehemías"],
					["est", "ester"],
					["job", "job"],
					["sl", "sal", "salmos", "salmo"],
					["pr", "prov", "proverbios"],
					["ec", "ecl", "eclesiastés"],
					["can", "cant", "el cantar de los cantares"],
					["is", "isa", "isaías"],
					["jer", "jer", "jeremías"],
					["lam", "lamentaciones"],
					["eze", "ezeq", "ezequiel"],
					["da", "dan", "daniel"],
					["os", "ose", "hosea"],
					["joe", "joel"],
					["am", "amós"],
					["abd", "abdías"],
					["jon", "jonás"],
					["miq", "miqueas"],
					["na", "nah", "nahúm"],
					["hab", "habacuc"],
					["sof", "sofonías"],
					["ag", "ageo"],
					["zac", "zacarías"],
					["mal", "malaquías"],
					["mt", "mat", "mateo"],
					["mr", "mar", "marcos"],
					["lu", "luc", "lucas"],
					["jn", "juan"],
					["hch", "hech", "hechos"],
					["ro", "rom", "romanos"],
					["1co", "1cor", "1corintios"],
					["2co", "2cor", "2corintios"],
					["gal", "gál", "gálatas"],
					["ef", "efe", "efes", "efesios"],
					["flp", "fili", "filip", "filipenses"],
					["col", "colosenses"],
					["1te", "1tes", "1tesalonicenses"],
					["2te", "2tes", "2tesalonicenses"],
					["1ti", "1tim", "1timoteo"],
					["2ti", "2tim", "2timoteo"],
					["tit", "tito"],
					["flm", "file", "filem", "filemón"],
					["heb", "hebreos"],
					["snt", "sant", "santiago"],
					["1pe", "1ped", "1pedro"],
					["2pe", "2ped", "2pedro"],
					["1jn", "1juan"],
					["2jn", "2juan"],
					["3jn", "3juan"],
					["jud", "judas"],
					[
						"rev",
						"ap",
						"apo",
						"apoc",
						"revelación",
						"revelacion",
						"apocalipsis",
					],
				];

				const wtLocaleFI = "FI";
				const bibleBooksFI = [
					["1mo", "1moos", "1mooseksen"],
					["2mo", "2moos", "2mooseksen"],
					["3mo", "3moos", "3mooseksen"],
					["4mo", "4moos", "4mooseksen"],
					["5mo", "5moos", "5mooseksen"],
					["jos", "joos", "joosuan"],
					["tu", "tuom", "tuomarien"],
					["ru", "ruth", "ruut", "ruutin"],
					["1sa", "1sam", "1samuelin"],
					["2sa", "2sam", "2samuelin"],
					["1ku", "1kun", "1kuninkaiden"],
					["2ku", "2kun", "2kuninkaiden"],
					["1ai", "1aik", "1aikakirjan"],
					["2ai", "2aik", "2aikakirjan"],
					["esr", "esra", "esran"],
					["ne", "neh", "nehemian"],
					["est", "esterin"],
					["job", "jobin"],
					["ps", "psalmit", "psalmien"],
					["san", "sanan", "sananlaskujen"],
					["sr", "saarn", "saarnajan"],
					["lal", "laul", "laulujen"],
					["jes", "jesajan"],
					["jer", "jeremian"],
					["va", "valit", "valituslaulut"],
					["hes", "hesekielin"],
					["da", "danielin"],
					["ho", "hoosean"],
					["jl", "joel", "joelin"],
					["am", "amos", "amoksen"],
					["ob", "obadjan"],
					["jn", "jonan"],
					["mi", "miik", "miikan"],
					["na", "nahumin"],
					["hab", "habakukin"],
					["sef", "sefanian"],
					["hag", "haggain"],
					["sak", "sakarjan"],
					["mal", "malakian"],
					["mt", "mat", "matteuksen"],
					["mr", "mark", "markuksen"],
					["lu", "luuk", "luukkaan"],
					["joh", "johanneksen"],
					["ap", "apt", "apostolien"],
					["ro", "room", "roomalaisille"],
					["1ko", "1kor", "1korinttilaisille"],
					["2ko", "2kor", "2korinttilaisille"],
					["ga", "gal", "galatalaisille"],
					["ef", "efesolaisille"],
					["fil", "filippiläisille"],
					["kol", "kolossalaisille"],
					["1te", "1tes", "1tesalonikalaisille"],
					["2te", "2tes", "2tesalonikalaisille"],
					["1ti", "1tim", "1timoteukselle"],
					["2ti", "2tim", "2timoteukselle"],
					["tit", "titukselle"],
					["flm", "filemonille"],
					["hpr", "heprealaisille"],
					["ja", "jaak", "jaakobin"],
					["1pi", "1piet", "1pietarin"],
					["2pi", "2piet", "2pietarin"],
					["1jo", "1joh", "1johanneksen"],
					["2jo", "2johanneksen"],
					["3jo", "3johanneksen"],
					["ju", "juudaksen"],
					["il", "ilmestys"],
				];

				const wtLocaleUA = "K";
				const bibleBooksUA = [
					["бт", "бут", "буття"],
					["вх", "вих", "вихід"],
					["лв", "лев", "левит"],
					["чс", "чис", "числа"],
					["вт", "втор", "повт", "повторення", "второзаконня"],
					["нав", "існ", "єгошуа", "ісус навин"],
					["сд", "суд", "судді", "суддів"],
					["рт", "рут"],
					["1см", "1сам", "1цар", "1самуїла"],
					["2см", "2сам", "2цар", "2самуїла"],
					["1цр", "1цар", "3цар", "1царів"],
					["2цр", "2цар", "4цар", "2царів"],
					[
						"1п",
						"1хр",
						"1пар",
						"1хронік",
						"1хроніки",
						"1паралипоменон",
					],
					[
						"2п",
						"2хр",
						"2пар",
						"2хронік",
						"2хроніки",
						"2паралипоменон",
					],
					["езд", "єзд", "ездра"],
					["не", "нем", "неєм", "неємія"],
					["ес", "ест", "естер", "есфір"],
					["йв", "йов", "іов", "иов"],
					["пс", "псалом", "псалми"],
					["пр", "прип", "притчі", "приповісті"],
					["ек", "екл", "еккл", "екклезіаста"],
					[
						"псн",
						"пісн",
						"пісня",
						"пісня пісень",
						"пісня над піснями",
					],
					["іс", "ісая", "ісаї"],
					["єр", "єрем", "єремія"],
					["пл", "плач", "плач єремії"],
					["єз", "єзек", "єзекіїль"],
					["дн", "дан", "даниїл"],
					["ос", "осія"],
					["йл", "йоіл", "йоїл", "йоель", "іоїль"],
					["ам", "амос"],
					["ов", "овд", "овдій", "авдій"],
					["йн", "йона", "іона"],
					["мих", "михей"],
					["на", "наум", "наумій"],
					["ав", "авв", "авакум"],
					["сф", "соф", "софонія"],
					["ог", "огій", "аггей"],
					["зх", "зах", "захарія"],
					["мл", "мал", "малахія"],
					["мт", "мат", "матвій", "матвія"],
					["мк", "мр", "марк", "марка"],
					["лк", "лук", "лука"],
					["ів", "йн", "іван", "йоан", "івана"],
					["дії", "діяння"],
					["рм", "рим", "римлян"],
					["1кр", "1кор", "1коринфян"],
					["2кр", "2кор", "2коринфян"],
					["гл", "гал", "галатів"],
					["еф", "ефесян"],
					["флп", "филипян", "филип'ян", "филип'янам"],
					["кол", "колосян"],
					["1фс", "1фес", "1фессалонікійців"],
					["2фс", "2фес", "2фессалонікійців"],
					["1тм", "1тим", "1тимофія", "1тимофію"],
					["2тм", "2тим", "2тимофія", "2тимофію"],
					["тит", "тита"],
					["флм", "филимона"],
					["єв", "євр", "євреїв"],
					["як", "яків", "якова"],
					["1пт", "1пет", "1петра"],
					["2пт", "2пет", "2петра"],
					["1ів", "1йн", "1івана", "1йоана"],
					["2ів", "2йн", "2івана", "2йоана"],
					["3ів", "3йн", "3івана", "3йоана"],
					["юд", "юди", "юда"],
					["об", "обявл", "одкровення", "об'явлення"],
				];

				const wtLocaleHU = "H";
				const jwEndpointHU =
					"https://www.jw.org/hu/konyvtar/biblia/magyarazatos-biblia/konyvek/json/html/";
				const bibleBooksHU = [
					["1mó", "1mo", "1mózes"],
					["2mó", "2mo", "2mózes"],
					["3mó", "3mo", "3mózes"],
					["4mó", "4mo", "4mózes"],
					["5mó", "5mo", "5mózes"],
					["jzs", "jozs", "józsué"],
					["bí", "bir", "bírák"],
					["ru", "ruth", "ruth"],
					["1sá", "1sam", "1sámuel"],
					["2sá", "2sam", "2sámuel"],
					["1ki", "1kir", "1királyok"],
					["2ki", "2kir", "2királyok"],
					["1kr", "1kron", "1krónikák"],
					["2kr", "2kron", "2krónikák"],
					["ezs", "ezsdr", "ezsdrás"],
					["ne", "neh", "nehémiás"],
					["esz", "eszt", "eszter"],
					["jób", "job", "jób"],
					["zs", "zsolt", "zsoltárok"],
					["pl", "peld", "példabeszédek"],
					["pr", "pred", "prédikátor"],
					["én", "enek", "énekek éneke"],
					["ézs", "ezsai", "ézsaiás"],
					["jr", "jer", "jeremiás"],
					["si", "siral", "siralmak"],
					["ez", "ezek", "ezékiel"],
					["dá", "dan", "dániel"],
					["hó", "hos", "hóseás"],
					["jóe", "joel", "jóel"],
					["ám", "amo", "ámós"],
					["ab", "abd", "abdiás"],
					["jón", "jónás", "jónás"],
					["mi", "mike", "mikeás"],
					["ná", "nah", "náhum"],
					["ha", "hab", "habakuk"],
					["so", "sof", "sofóniás"],
					["ag", "agg", "aggeus"],
					["za", "zak", "zakariás"],
					["ma", "mal", "malakiás"],
					["mt", "mat", "máté"],
					["mr", "mar", "márk"],
					["lk", "luk", "lukács"],
					["jn", "ján", "jános"],
					["cs", "csel", "cselekedetek"],
					["ró", "rom", "róma"],
					["1ko", "1kor", "1korintusz"],
					["2ko", "2kor", "2korintusz"],
					["ga", "gal", "galácia"],
					["ef", "efez", "efézus"],
					["flp", "filip", "filippi"],
					["kol", "kolosz", "kolosszé"],
					["1te", "1tesz", "1tesszalonika"],
					["2te", "2tesz", "2tesszalonika"],
					["1tim", "1timo", "1timóteusz"],
					["2tim", "2timo", "2timóteusz"],
					["tit", "titu", "titusz"],
					["flm", "filem", "filemon"],
					["héb", "heb", "héberek"],
					["jk", "jak", "jakab"],
					["1pt", "1pet", "1péter"],
					["2pt", "2pet", "2péter"],
					["1jn", "1jan", "1jános"],
					["2jn", "2jan", "2jános"],
					["3jn", "3jan", "3jános"],
					["júd", "júdás"],
					["jel", "jelen", "jelenések"],
				];

				let wtLocale = wtLocaleEN;
				let jwEndpoint = jwEndpointEN;
				let bibleBooks = bibleBooksEN;

				switch (this.settings.pluginLanguage) {
					case "nl":
						wtLocale = wtLocaleNL;
						bibleBooks = bibleBooksNL;
						break;
					case "fr":
						wtLocale = wtLocaleFR;
						bibleBooks = bibleBooksFR;
						break;
					case "pt-br":
						wtLocale = wtLocalePtBr;
						bibleBooks = bibleBooksPtBr;
						break;
					case "pt":
						wtLocale = wtLocalePt;
						bibleBooks = bibleBooksPt;
						break;
					case "de":
						wtLocale = wtLocaleDE;
						bibleBooks = bibleBooksDE;
						break;
					case "es":
						wtLocale = wtLocaleES;
						bibleBooks = bibleBooksES;
						break;
					case "fi":
						wtLocale = wtLocaleFI;
						bibleBooks = bibleBooksFI;
						break;
					case "ua":
						wtLocale = wtLocaleUA;
						bibleBooks = bibleBooksUA;
						break;
					case "hu":
						wtLocale = wtLocaleHU;
						jwEndpoint = jwEndpointHU;
						bibleBooks = bibleBooksHU;
						break;
				}

				let linkOutput = "";
				let context = "";
				let bibleBookLong;
				let bibleBookHasNumber = false;

				if ([1, 2, 3, 4, 5].includes(parseInt(input.substring(0, 1)))) {
					if (input.substring(1, 2) == " ") {
						input = input.substring(0, 1) + input.substring(2);
					}
					bibleBookHasNumber = true;
				}

				const bibleBookQuery = input.split(" ")[0].toLowerCase();
				for (let i = 0; i < bibleBooks.length; i++) {
					if (bibleBooks[i].includes(bibleBookQuery)) {
						if ((i + 1).toString().length == 1) {
							linkOutput += "0" + (i + 1);
						} else {
							linkOutput += i + 1;
						}
						bibleBookLong = bibleBooks[i][bibleBooks[i].length - 1];
						i = bibleBooks.length;
					}
				}

				if (bibleBookLong == undefined) {
					//If an error occurs, replace text with initial input
					if (input != null) {
						editor.replaceSelection(input);
					}

					errorModal.setText(this.getTranslation("INVALID_INPUT"));
					errorModal.open();
					return;
				}

				let chapter = input.split(" ")[1];
				chapter = chapter.split(":")[0];
				if (chapter.length == 1) {
					linkOutput += "00" + chapter;
				} else if (chapter.length == 2) {
					linkOutput += "0" + chapter;
				} else {
					linkOutput += chapter;
				}

				context += linkOutput;

				let verse = input.split(" ")[1];
				verse = verse.split(":")[1];
				if (verse.includes("-")) {
					verse = verse.split("-")[0];
				} else if (input.includes(",")) {
					verse = verse.split(",")[0];
				}
				if (verse.length == 1) {
					linkOutput += "00" + verse;
				} else if (verse.length == 2) {
					linkOutput += "0" + verse;
				} else {
					linkOutput += verse;
				}

				let verseContinue = "";

				if (input.includes("-")) {
					verseContinue = input.split("-")[1];
				} else if (input.includes(",")) {
					verseContinue = input.split(",")[1];
					if (verseContinue.substring(0, 1) == " ") {
						verseContinue = verseContinue.substring(1);
					}
				}
				if (verseContinue != undefined && verseContinue != "") {
					linkOutput += "-" + context;
					if (verseContinue.length == 1) {
						linkOutput += "00" + verseContinue;
					} else if (verseContinue.length == 2) {
						linkOutput += "0" + verseContinue;
					} else {
						linkOutput += verseContinue;
					}
				}

				let renderOutput;

				if (this.settings.expandBibleBookName) {
					if (
						this.settings.addSpaceAfterBibleBookNumber &&
						bibleBookHasNumber
					) {
						renderOutput =
							bibleBookLong?.substring(0, 1) +
							" " +
							bibleBookLong?.slice(1) +
							" " +
							input.split(" ")[1];
						if (input.split(" ")[2]) {
							renderOutput += " " + input.split(" ")[2];
						}
					} else {
						renderOutput =
							bibleBookLong + " " + input.split(" ")[1];
						if (input.split(" ")[2]) {
							renderOutput += " " + input.split(" ")[2];
						}
					}
				} else {
					if (
						this.settings.addSpaceAfterBibleBookNumber &&
						bibleBookHasNumber
					) {
						renderOutput =
							input.substring(0, 1) + " " + input.slice(1);
					} else {
						renderOutput = input;
					}
				}

				if (this.settings.capitalizeFirstCharBibleBookName) {
					if (bibleBookHasNumber) {
						if (this.settings.addSpaceAfterBibleBookNumber) {
							renderOutput =
								renderOutput.substring(0, 2) +
								renderOutput.charAt(2).toUpperCase() +
								renderOutput.slice(3);
						} else {
							renderOutput =
								renderOutput.substring(0, 1) +
								renderOutput.charAt(1).toUpperCase() +
								renderOutput.slice(2);
						}
					} else {
						renderOutput =
							renderOutput.charAt(0).toUpperCase() +
							renderOutput.slice(1);
					}
				}

				if (this.settings.makeBold) {
					renderOutput = "**" + renderOutput + "**";
				}
				if (this.settings.makeItalic) {
					renderOutput = "*" + renderOutput + "*";
				}

				renderOutput =
					this.settings.linkPrefix +
					renderOutput +
					this.settings.linkSuffix;

				const link = `jwlibrary:///finder?srcid=jwlshare&wtlocale=${wtLocale}&prefer=lang&pub=${this.settings.bibleEdition}&bible=${linkOutput}`;

				if (action == EditorAction.InsertUrl) {
					editor.replaceSelection(
						"[" + renderOutput + "](" + link + ")",
					);
				}

				if (
					(action == EditorAction.InsertUrl &&
						this.settings.autoOpenLink) ||
					action == EditorAction.OpenUrl
				) {
					window.open(link);
				}

				if (
					(action != EditorAction.OpenUrl &&
						this.settings.insertQuote) ||
					action == EditorAction.InsertQuotation
				) {
					await insertBibleQuotation(editor, linkOutput, jwEndpoint);
				}
			} catch {
				//If an error occurs, replace text with initial input
				if (input != null) {
					editor.replaceSelection(input);
				}

				//Show error modal
				errorModal.setText(this.getTranslation("INVALID_INPUT"));
				errorModal.open();
			}
		};

		//Add editor commands
		this.addCommand({
			id: "convert-Bible-text-to-JW-Library-link",
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- This contains the name of an external application
			name: "Convert Bible text to JW Library link",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await convertBibleTextToJWLibraryLink(
					editor,
					EditorAction.InsertUrl,
				);
			},
		});

		this.addCommand({
			id: "open-Bible-text-in-JW-Library",
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- This contains the name of an external application
			name: "Open Bible text in JW Library",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await convertBibleTextToJWLibraryLink(
					editor,
					EditorAction.OpenUrl,
				);
			},
		});

		this.addCommand({
			id: "insert-quotation-from-bible",
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- This contains the name of a Book's title therefore should be capitalized
			name: "Insert quotation from Bible",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				await convertBibleTextToJWLibraryLink(
					editor,
					EditorAction.InsertQuotation,
				);
			},
		});

		//Add a settings tab so the user can configure plugin settings
		this.addSettingTab(new MainSettingTab(this.app, this));

		//Update notes modal
		if (this.currentPluginVersion != this.settings.lastVersion) {
			this.settings.lastVersion = this.currentPluginVersion;
			await this.saveSettings();
			new UpdateNotesModal(this.app)
				.receiveVersion(this.currentPluginVersion)
				.open();
		}
	}

	onunload() {}

	async loadSettings() {
		const data = (await this.loadData()) as PluginSettings | undefined;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ErrorModal extends Modal {
	plugin: NwtLinker;

	constructor(app: App) {
		super(app);
	}

	setText(text: string) {
		const { contentEl } = this;
		contentEl.createEl("p", {
			text: text,
		});
	}

	onOpen() {}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class UpdateNotesModal extends Modal {
	plugin: NwtLinker;

	currentPluginVersion: string;

	constructor(app: App) {
		super(app);
	}

	receiveVersion(version: string) {
		this.currentPluginVersion = version;
		return this;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", {
			text:
				"🎉 New update for Bible linker Pro (" +
				this.currentPluginVersion +
				")",
		});
		contentEl.createEl("h3", { text: "What's new?" });
		contentEl.createEl("br");

		//Changelog
		const splashScreenText = `
		-   Forked from Bible Linker Pro
		-   Added online quotation support
		`;
		const splayScreenList = splashScreenText
			.replace(/- {3}/g, "")
			.split("\n");

		for (let i = 0; i < splayScreenList.length; i++) {
			if (splayScreenList[i].length > 2) {
				contentEl.createEl("li", {
					text: splayScreenList[i],
				});
				contentEl.createEl("br");
			}
		}

		contentEl.createEl("br");
		contentEl.createEl("br");

		const dismisButton = contentEl.createEl("button", {
			text: "Let's check it out!",
		});
		dismisButton.addEventListener("click", () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
