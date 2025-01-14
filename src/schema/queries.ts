export const queriesSchema = {
	$schema: "http://json-schema.org/draft-07/schema#",
	additionalProperties: {
		$ref: "#/definitions/SearchQuery",
	},
	definitions: {
		SearchQuery: {
			properties: {
				class: {
					type: "string",
				},
				staticColor: {
					type: ["null", "string"],
				},
				staticDecoration: {
					type: "string",
				},
				staticCss: {
					type: "StyleSpec",
				},
				colorIconSnippet: {
					type: "string",
				},
				regex: {
					type: "boolean",
				},
				query: {
					type: "string",
				},
				mark: {
					items: {
						enum: ["line", "match"],
						type: "string",
					},
					type: "array",
				},
				enabled: {
					type: "boolean",
				},
				tag: {
					type: "string",
				},
				tagEnabled: {
					type: "boolean",
				},
			},
			required: [
				"class",
				"staticColor",
				"staticDecoration",
				"staticCss",
				"colorIconSnippet",
				"regex",
				"query",
				"enabled",
				"tag",
				"tagEnabled",
			],
		},
	},
};
