"use client";

import type { OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import { createContext } from "react";

import type { PageContentName } from "@/lib/page-content-schema";

export type ContentValues = Record<string, string>;
export type MediaReference = { mediaId: number; descriptor: OptimizedImageDescriptor };

export type PageContentContextValue = {
	editing: boolean;
	generation: number;
	media: Record<string, MediaReference>;
	page: PageContentName;
	values: ContentValues;
	storeDraft: (field: string, value: string) => void;
	update: (field: string, value: string) => void;
	updateMedia: (field: string, value: MediaReference) => void;
};

export const PageContentContext = createContext<PageContentContextValue | null>(null);
