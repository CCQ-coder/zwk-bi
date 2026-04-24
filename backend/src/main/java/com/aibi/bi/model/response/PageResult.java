package com.aibi.bi.model.response;

import java.util.List;

public class PageResult<T> {

    private List<T> items;
    private long total;
    private int page;
    private int pageSize;

    public static <T> PageResult<T> of(List<T> items, long total, int page, int pageSize) {
        PageResult<T> result = new PageResult<>();
        result.setItems(items);
        result.setTotal(total);
        result.setPage(page);
        result.setPageSize(pageSize);
        return result;
    }

    public List<T> getItems() {
        return items;
    }

    public void setItems(List<T> items) {
        this.items = items;
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }
}