export default function dataVerify(date: any) {

    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
}