/**
 * Gera o elemento SVG do ícone do Syncthing.
 * @param colorClass Classe CSS para colorir o ícone (ex: st-color-success)
 */
export function createSyncthingIcon(colorClass: string): SVGSVGElement {
	const ns = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(ns, "svg");
	svg.setAttribute("viewBox", "0 0 192 192");
	svg.classList.add("st-icon-svg");

	if (colorClass) {
		svg.classList.add(colorClass);
	}

	const path1 = document.createElementNS(ns, "path");
	path1.setAttribute(
		"d",
		"M161.785 101.327a66 66 0 0 1-4.462 19.076m-49.314 40.495A66 66 0 0 1 96 162a66 66 0 0 1-45.033-17.75M31.188 83.531A66 66 0 0 1 96 30a66 66 0 0 1 39.522 13.141",
	);
	path1.setAttribute("fill", "none");
	path1.setAttribute("stroke", "currentColor");
	path1.setAttribute("stroke-width", "12");
	path1.setAttribute("stroke-linecap", "round");
	path1.setAttribute("stroke-linejoin", "round");
	svg.appendChild(path1);

	const path2 = document.createElementNS(ns, "path");
	path2.setAttribute(
		"d",
		"M146.887 147.005a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zm18.25-78.199a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zM118.5 105a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zm-76.248 11.463a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9 9 9 0 0 1 9 9zm113.885-68.656a21 21 0 0 0-21 21 21 21 0 0 0 1.467 7.564l-14.89 11.555A21 21 0 0 0 109.5 84a21 21 0 0 0-20.791 18.057l-36.45 5.48a21 21 0 0 0-19.007-12.074 21 21 0 0 0-21 21 21 21 0 0 0 21 21 21 21 0 0 0 20.791-18.059l36.463-5.48A21 21 0 0 0 109.5 126a21 21 0 0 0 6.283-.988l5.885 8.707a21 21 0 0 0-4.781 13.287 21 21 0 0 0 21 21 21 21 0 0 0 21-21 21 21 0 0 0-21-21 21 21 0 0 0-6.283.986l-5.883-8.707A21 21 0 0 0 130.5 105a21 21 0 0 0-1.428-7.594l14.885-11.552a21 21 0 0 0 12.18 3.953 21 21 0 0 0 21-21 21 21 0 0 0-21-21z",
	);
	path2.setAttribute("fill", "currentColor");
	path2.setAttribute("fill-rule", "evenodd");
	svg.appendChild(path2);

	return svg;
}
