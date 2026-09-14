import {expect, test} from 'vitest'
import {sections} from "../../utils/Connection.js";

test("Store outside functional component", () => {
    const connection = {sectionsComplete : 0};

    expect(sections.isComplete(connection, sections.technical)).toBeFalsy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeFalsy();
    expect(sections.isComplete(connection, sections.testConnection)).toBeFalsy();
    expect(sections.isComplete(connection, sections.publish)).toBeFalsy();

    sections.complete(connection, sections.technical);
    expect(sections.isComplete(connection, sections.technical)).toBeTruthy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeFalsy();
    expect(sections.isComplete(connection, sections.testConnection)).toBeFalsy();
    expect(sections.isComplete(connection, sections.publish)).toBeFalsy();

    sections.complete(connection, sections.informationProfile);
    expect(sections.isComplete(connection, sections.technical)).toBeTruthy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeTruthy();
    expect(sections.isComplete(connection, sections.testConnection)).toBeFalsy();
    expect(sections.isComplete(connection, sections.publish)).toBeFalsy();

    sections.complete(connection, sections.testConnection);
    expect(sections.isComplete(connection, sections.technical)).toBeTruthy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeTruthy();
    expect(sections.isComplete(connection, sections.testConnection)).toBeTruthy();
    expect(sections.isComplete(connection, sections.publish)).toBeFalsy();
    expect(sections.allCompleted(connection)).toBeFalsy();

    sections.complete(connection, sections.publish);
    expect(sections.isComplete(connection, sections.technical)).toBeTruthy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeTruthy();
    expect(sections.isComplete(connection, sections.testConnection)).toBeTruthy();
    expect(sections.isComplete(connection, sections.publish)).toBeTruthy();

    expect(sections.allCompleted(connection)).toBeTruthy();
});
