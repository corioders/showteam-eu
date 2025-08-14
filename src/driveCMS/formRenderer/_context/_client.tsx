"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { FormRendererContextT } from "./_type.js";

export const formRendererClientContext = createContext<FormRendererContextT>({});

export function useFormRendererClientContext() {
	return useContext(formRendererClientContext);
}

export function FormRendererClientContextProvider(props: { children: ReactNode; value: FormRendererContextT }) {
	return <formRendererClientContext.Provider value={props.value}>{props.children}</formRendererClientContext.Provider>;
}
