export type ImportItemType = 'h' | 'b'

export interface ImportItem {
    type: ImportItemType
    browserId: number
    url: string
}
