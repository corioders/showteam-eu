"use client";

import { LinkIcon } from "lucide-react";
import { useContext } from "react";

import { PageContentContext } from "@/components/editor/page-content-context";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { pageContentLinkFields } from "@/lib/page-content-fields";

export function PageContentPanel() {
	const content = useContext(PageContentContext);
	const fields = content ? pageContentLinkFields[content.page] : undefined;
	if (!content || !fields) {
		return null;
	}

	return (
		<Sheet>
			<SheetTrigger render={<Button type="button" variant="outline" size="sm" />}>
				<LinkIcon data-icon="inline-start" />
				Edytuj linki
			</SheetTrigger>
			<SheetContent title="Edytuj linki strony" description="Zmień adresy używane przez odnośniki na tej stronie.">
				<SheetHeader>
					<FieldGroup>
						{Object.entries(fields).map(([field, label]) => {
							const id = `page-content-${content.page}-${field}`;
							return (
								<Field key={field}>
									<FieldLabel htmlFor={id}>{label}</FieldLabel>
									<Input id={id} type="url" inputMode="url" value={content.values[field] ?? ""} onChange={(event) => content.update(field, event.target.value)} />
								</Field>
							);
						})}
					</FieldGroup>
				</SheetHeader>
			</SheetContent>
		</Sheet>
	);
}
