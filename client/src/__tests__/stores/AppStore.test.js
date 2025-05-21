import {expect, test} from 'vitest'
import {useAppStore} from "../../stores/AppStore";

test("Store outside functional component", () => {
    const csrfTokenFromState = useAppStore.getState().csrfToken;
    expect(csrfTokenFromState).toBeUndefined();

    useAppStore.setState({csrfToken: "test"});

    const updatedCsrfToken = useAppStore.getState().csrfToken;
    expect(updatedCsrfToken).toEqual("test");
});