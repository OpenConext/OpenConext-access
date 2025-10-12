export const createAndClickLink = href => {
    const link = document.createElement("a");
    link.href = href;
    //Also works for mailto:
    link.target = "_blank";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}
