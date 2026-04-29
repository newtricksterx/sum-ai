import { GetPageFromStorage, GetSummaryFromStorage } from "./storage"

export const ReturnState = () => {
    const pageNum = GetPageFromStorage();

    return pageNum == 1;
}

export const ForwardState = () => {
    const pageNum = GetPageFromStorage();
    const summary = GetSummaryFromStorage();

    return pageNum == 0 && summary !== "";
}

export const RegenerateState = (isSummarizing : boolean) => {
    const pageNum = GetPageFromStorage();

    return pageNum == 1 && !isSummarizing;
}

export const CopyState = () => {
    const pageNum = GetPageFromStorage();
    const summary = GetSummaryFromStorage();

    return pageNum == 1 || summary === "";
}