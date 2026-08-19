export type FileOrFolderPath = string & { readonly __filePathTag: unique symbol };
