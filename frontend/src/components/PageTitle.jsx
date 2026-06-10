import { useEffect } from 'react';

/**
 * Updates the browser tab title for the current page.
 */
export default function PageTitle({ title }) {
    useEffect(() => {
        const prev = document.title;
        document.title = title ? `${title} | MeetOn` : 'MeetOn – Video Meetings for Everyone';
        return () => { document.title = prev; };
    }, [title]);
    return null;
}
