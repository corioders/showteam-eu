// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
export function slugFromName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[ąćęłńóśźż]/g, (letter) => ({ ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" })[letter] || letter)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
}
