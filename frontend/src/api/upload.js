import request from './request';
export const uploadImage = (file, options) => {
    const formData = new FormData();
    const fallbackName = options?.filename || `upload-${Date.now()}.png`;
    if (typeof File !== 'undefined' && file instanceof File) {
        formData.append('file', file);
    }
    else {
        formData.append('file', file, fallbackName);
    }
    return request.post('/upload/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        params: options?.category ? { category: options.category } : undefined,
    });
};
