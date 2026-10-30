export const messages = [];
const toast = (msg) => messages.push(['info', msg]);
toast.success = (msg) => messages.push(['success', msg]);
toast.error = (msg) => messages.push(['error', msg]);
toast.dismiss = () => {};
export { toast };
export default toast;
