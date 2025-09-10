import { requestUrl, RequestUrlParam } from "obsidian";

export async function fetchVerse(
	verseRange: string,
	showVerseNum: boolean,
	endpoint: string,
): Promise<string> {
	if (verseRange.charAt(0) === "0") {
		//remove the first 0 if the book is in the first 9 cause of json querying
		verseRange = verseRange.substring(1);
	}

	const url = endpoint + verseRange;
	const res = await requestUrl({
		url,
		method: "GET",
		headers: {
			Accept: "application/json",
		},
	} as RequestUrlParam);

	const raw = res.text;
	const data = JSON.parse(raw);

	await Promise.resolve();

	// if 404 error
	if (res.status === 404) {
		return "";
	}

	const rangeKey = Object.keys(data.ranges)[0];
	const text = stripVerseText(data.ranges[rangeKey].html, showVerseNum);

	return text ?? "";
}

const stripVerseText = (
	html: string,
	showVerseNum: boolean,
): string | undefined => {
	const doc = new DOMParser().parseFromString(html, "text/html");

	doc.querySelectorAll("span.chapterNum").forEach((el) => {
		if (showVerseNum) {
			const textNode = document.createTextNode(
				'<font color="#7F9FD3">1</font>',
			);
			el.parentNode?.insertBefore(textNode, el);
		}
		el.remove();
	});
	doc.querySelectorAll("sup.verseNum").forEach((el) => {
		if (showVerseNum) {
			//this fixes double space issues
			el.textContent = (el.textContent ?? "").trim();
			el.parentNode?.insertBefore(
				doc.createTextNode('<font color="#7F9FD3">'),
				el,
			);
			el.parentNode?.insertAfter(doc.createTextNode("</font>"), el);
		} else {
			el.remove();
		}
	});
	doc.querySelectorAll("sup.marker").forEach((el) => el.remove());
	// also double space fix
	doc.querySelectorAll(".parabreak, .newblock").forEach((el) => {
		el.parentNode?.insertBefore(doc.createTextNode(" "), el);
		el.remove();
	});

	// Grab plain text from html
	let text = doc.body.textContent;

	if (text) {
		text = text
			.replace(/[+*#]/g, "") // remove +, *, #
			.replace(/\s+/g, " ") // replace multiple whitespace chars with a single space
			.trim(); // trim leading/trailing spaces
	}

	return text ?? undefined;
};