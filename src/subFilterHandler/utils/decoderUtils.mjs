import * as zlib from 'zlib';

export const gunzipAsync = (payload) => {
    return new Promise((resolve, reject) => {
        zlib.gunzip(payload, (err, res) => {
            if (err) {
                console.error('Unable to unzip payload');
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}