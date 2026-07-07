import { describe, it, expect } from "vitest";

import {
  wantsDocumentContext,
  referencesSpecificDocument,
  wantsFullDocument,
} from "./documentIntent";

describe("wantsDocumentContext", () => {
  it("is true for messages that mention documents/files", () => {
    for (const msg of [
      "summarize this document",
      "what's in the file I uploaded",
      "open my resume",
      "check the pdf",
      "look at the attachment",
    ]) {
      expect(wantsDocumentContext(msg)).toBe(true);
    }
  });

  it("is true for specific-document references without a keyword", () => {
    expect(wantsDocumentContext("summarize the one I just uploaded")).toBe(true);
  });

  it("is false for general chit-chat", () => {
    for (const msg of [
      "what's the weather today",
      "write me a haiku about cats",
      "what time is it in Tokyo",
    ]) {
      expect(wantsDocumentContext(msg)).toBe(false);
    }
  });

  it("is case-insensitive", () => {
    expect(wantsDocumentContext("SUMMARIZE THIS DOCUMENT")).toBe(true);
  });
});

describe("referencesSpecificDocument", () => {
  it("is true when pointing at a just-uploaded / specific doc", () => {
    for (const msg of [
      "summarize the document I just uploaded",
      "what does this document say",
      "tell me about that file",
      "open my latest upload",
      "the resume i uploaded",
      "the most recent document",
    ]) {
      expect(referencesSpecificDocument(msg)).toBe(true);
    }
  });

  it("is false for generic document mentions", () => {
    for (const msg of [
      "can you help me write a document",
      "what is a pdf",
      "documents are useful",
    ]) {
      expect(referencesSpecificDocument(msg)).toBe(false);
    }
  });
});

describe("wantsFullDocument", () => {
  it("is true for summary / whole-document intents", () => {
    for (const msg of [
      "summarize this",
      "give me a summary",
      "tl;dr of the file",
      "what's the overview",
      "the key points please",
      "what is in the document",
    ]) {
      expect(wantsFullDocument(msg)).toBe(true);
    }
  });

  it("is false for targeted lookups", () => {
    for (const msg of [
      "what's my phone number in the resume",
      "find the section about pricing",
    ]) {
      expect(wantsFullDocument(msg)).toBe(false);
    }
  });
});
