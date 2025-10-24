import Dexie, { Table } from "dexie";

export interface Word {
    id: number;
    kanji?: string;
    setId?: number;
    createdAt?: string;
    updatedAt?: string;
    kana: string;
    meaning: string;
    type?: string;
    example?: string;
    review?: {
        times: number;
        nextReview?: string;
        difficulty?: number;
    };
    mark?: string;
}

export interface WordSet {
    id: number;
    name: string;
    createdAt?: string;
    updatedAt?: string;
    mark?: string;
}

export class JpLearnDB extends Dexie {
    wordSets!: Table<WordSet, number>;
    words!: Table<Word, number>;

    constructor() {
        super("jpLearnDB");
        this.version(1).stores({
            wordSets: "++id, name, createdAt",
            words: "++id, kana, kanji, meaning, type, [setId+kana]",
        });
    }
}

export const db = new JpLearnDB();


