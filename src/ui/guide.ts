import { marked } from "marked";
import guide from "../../docs/user-guide.md?raw";

/**
 * The user guide as HTML, rendered once from docs/user-guide.md at build
 * time. The Markdown is part of this repository, not user input.
 */
export const guideHtml = marked.parse(guide, { async: false });
