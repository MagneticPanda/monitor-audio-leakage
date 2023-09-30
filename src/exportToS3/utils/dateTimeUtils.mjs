export const getSastDate = (date, useDash = true) => {
    /**
     * Returns the SAST date in the format YYYY/MM/DD
     */
    const options = {
        timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };
    let sastDate = date.toLocaleDateString('en-ZA', options);
    sastDate = useDash ? sastDate.replace(/\//g, '-') : sastDate;
    return sastDate;
};

export const getSastDateTime = (date, useDash = true) => {
    const options = {
        timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };
    let sastDateTime = new Date().toLocaleString('en-ZA', options);
    sastDateTime = useDash ? sastDateTime.replace(/\//g, '-') : sastDateTime;
    sastDateTime = sastDateTime.replace(', ', 'T');
    return sastDateTime;
};

export const getSastDateNDaysAgo = (noDaysAgo, useDash = true) => {
    /**
     * Returns the SAST date in the format YYYY-MM-DD (by default) or YYYY/MM/DD (if useDash is false
     */

    const getSastDate = (date, useDash = true) => {
        /**
         * Returns the SAST date in the format YYYY/MM/DD (by default) or YYYY-MM-DD (if useDash is false
         */
        const options = {
            timeZone: 'Africa/Johannesburg',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        };
        let sastDate = date.toLocaleDateString('en-ZA', options);
        sastDate = useDash ? sastDate.replace(/\//g, '-') : sastDate;
        return sastDate;
    };

    const date = new Date();
    date.setDate(date.getDate() - noDaysAgo);
    return getSastDate(date, useDash);
};

export const getSastDateTimeNDaysAgo = (noDaysAgo, useDash = true) => {
    /**
     * Returns the SAST date of yesterday in the format YYYY-MM-DDTHH:MM:SS (by default) or YYYY/MM/DDTHH:MM:SS (if useDash is false
     */

    const getSastDateTime = (date, useDash = true) => {
        /**
         * Returns the SAST date in the format YYYY/MM/DDTHH:MM:SS (by default) or YYYY-MM-DDTHH:MM:SS (if useDash is false
         */
        const options = {
            timeZone: 'Africa/Johannesburg',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        };
        let sastDateTime = new Date().toLocaleString('en-ZA', options);
        sastDateTime = useDash ? sastDateTime.replace(/\//g, '-') : sastDateTime;
        sastDateTime = sastDateTime.replace(', ', 'T');
        return sastDateTime;
    };

    const date = new Date();
    date.setDate(date.getDate() - noDaysAgo);
    return getSastDateTime(date, useDash);
};

const getSastDateTimeNSecsAgo = (noSecsAgo, useDash = true) => {
    /**
     * Returns the SAST date of yesterday in the format YYYY-MM-DDTHH:MM:SS (by default) or YYYY/MM/DDTHH:MM:SS (if useDash is false
     */

    const getSastDateTime = (date, useDash = true) => {
        /**
         * Returns the SAST date in the format YYYY/MM/DDTHH:MM:SS (by default) or YYYY-MM-DDTHH:MM:SS (if useDash is false
         */
        const options = {
            timeZone: 'Africa/Johannesburg',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        };
        let sastDateTime = new Date().toLocaleString('en-ZA', options);
        sastDateTime = useDash ? sastDateTime.replace(/\//g, '-') : sastDateTime;
        sastDateTime = sastDateTime.replace(', ', 'T');
        return sastDateTime;
    };

    const date = new Date();
    date.setSeconds(date.getSeconds() - noSecsAgo);
    return getSastDateTime(date, useDash);
};
