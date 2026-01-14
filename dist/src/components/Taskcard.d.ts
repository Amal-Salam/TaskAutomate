interface Props {
    title: string;
    desc: string;
    due?: string;
    assignee?: string;
    onClick?: () => void;
}
export default function TaskCard({ title, desc, due, assignee, onClick }: Props): import("react/jsx-runtime").JSX.Element;
export {};
