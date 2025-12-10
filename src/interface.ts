export interface QuotationResponse {
	status: number;
	currentLocale?: string;
	vernacularSectionHeadings?: VernacularSectionHeadings;
	ranges: Record<string, Range>;
	editionData?: EditionData;
}

export interface VernacularSectionHeadings {
	HdgMedia?: string;
	HdgFootnotes?: string;
	HdgMarginalReferences?: string;
	MarginalReferenceChars?: string;
}

export interface Range {
	citation?: string;
	link?: string;
	validRange?: string;
	citationVerseRange?: string;
	html?: string;
	//footnotes?: any[]; // structure not required for current usage
	//superscriptions?: any[];
	//multimedia?: any[];
	commentaries?: Commentary[];
	crossReferences?: CrossReference[];
	//pubReferences?: any[];
	verses?: Verse[];
	numTranslations?: number;
}

export interface Commentary {
	id: number;
	content: string;
	source?: string; // often the verse id that produced the commentary
	label?: string | null;
}

export interface CrossReference {
	id: number;
	source?: string;
	targets: CrossTarget[];
}

export interface CrossTarget {
	vs: string; // verse id string like "19037025"
	standardCitation?: string; // e.g., "Zsoltárok 37:25"
	abbreviatedCitation?: string; // e.g., "Zsoltárok 37:25"
	category?: {
		id?: string;
		label?: string;
	};
}

export interface Verse {
	vsID: string;
	bookNumber?: number;
	chapterNumber?: number;
	verseNumber?: number;
	standardCitation?: string;
	abbreviatedCitation?: string;
	content?: string; // html fragment of the verse
}

export interface EditionData {
	locale?: string;
	bookCount?: string;
	vernacularFullName?: string;
	vernacularShortName?: string | null;
	vernacularAbbreviation?: string;
	url?: string;
	titleFormat?: string;
	pageCSSClassNames?: string;
	articleCSSClassNames?: string;
	books?: Record<string, BookData>;
}

export interface BookData {
	chapterCount?: string;
	standardName?: string;
	standardAbbreviation?: string;
	officialAbbreviation?: string;
	standardSingularBookName?: string;
	standardSingularAbbreviation?: string;
	officialSingularAbbreviation?: string;
	standardPluralBookName?: string;
	standardPluralAbbreviation?: string;
	officialPluralAbbreviation?: string;
	bookDisplayTitle?: string;
	chapterDisplayTitle?: string;
	urlSegment?: string;
	url?: string;
	hasAudio?: boolean;
	hasMultimedia?: boolean;
	hasStudyNotes?: boolean;
	hasPublicationReferences?: boolean;
	additionalPages?: AdditionalPage[];
	images?: ImageData[];
}

export interface AdditionalPage {
	title?: string;
	mepsTitle?: string;
	url?: string;
	pageID?: string;
	pageCSSClassNames?: string;
	articleCSSClassNames?: string;
	abbreviatedTitle?: string;
	docClass?: string;
	type?: string;
}

export interface ImageData {
	type?: string; // e.g., "sqr"
	sizes?: SizesMap;
	altText?: string | null;
	caption?: string | null;
}

export interface SizesMap {
	// common size keys in the example: xs, sm, md, lg, xl
	[x: string]: string | undefined;
}

// Default export for convenience in imports
export default QuotationResponse;
