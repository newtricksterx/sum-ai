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

export const RegenerateState = () => {
    const pageNum = GetPageFromStorage();

    return pageNum == 1;
}