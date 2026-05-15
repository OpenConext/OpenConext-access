import {expect, test} from 'vitest'
import {sections} from "../../utils/Connection.js";

test("Store outside functional component", () => {
    const connection = {sectionsComplete : 0};

    expect(sections.isComplete(connection, sections.technical)).toBeFalsy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeFalsy();
    expect(sections.isComplete(connection, sections.productionStatus)).toBeFalsy();

    sections.complete(connection, sections.technical);
    expect(sections.isComplete(connection, sections.technical)).toBeTruthy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeFalsy();
    expect(sections.isComplete(connection, sections.productionStatus)).toBeFalsy();

    sections.complete(connection, sections.informationProfile);
    expect(sections.isComplete(connection, sections.technical)).toBeTruthy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeTruthy();
    expect(sections.isComplete(connection, sections.productionStatus)).toBeFalsy();

    sections.complete(connection, sections.productionStatus);
    expect(sections.isComplete(connection, sections.technical)).toBeTruthy();
    expect(sections.isComplete(connection, sections.informationProfile)).toBeTruthy();
    expect(sections.isComplete(connection, sections.productionStatus)).toBeTruthy();

    expect(sections.allCompleted(connection)).toBeTruthy();
});