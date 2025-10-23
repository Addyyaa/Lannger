import Dexie, { Table } from "dexie";

export interface Word {
    id: string;
    kanji?: string;
    kana: string;
    meaning: string;
    type?: string;
    example?: string;
    review?: {
        times: number;
        nextReview?: string;
        difficulty?: number;
    };
}

export interface WordSet {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

export class JpLearnDB extends Dexie {
    wordSets!: Table<WordSet, string>;
    words!: Table<Word, string>;

    constructor() {
        super("jpLearnDB");
        this.version(1).stores({
            wordSets: "id, name, createdAt",
            words: "id, kana, kanji, meaning, type, [setId+kana]",
        });
    }
}

export const db = new JpLearnDB();
