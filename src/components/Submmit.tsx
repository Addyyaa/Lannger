export default function Submmit(style: React.CSSProperties) {
    const width = style.width;
    const height = style.height;
    const color = style.color ?? "#6bebc3";
    const filter = style.filter;
    const transform = style.transform;
    const transition = style.transition;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 15 16"
            style={{
                filter,
                transform,
                transition,
                display: 'block',
            }}
        >
            <path fill={color} d="M12.49 7.14L3.44 2.27c-.76-.41-1.64.3-1.4 1.13l1.24 4.34q.075.27 0 .54l-1.24 4.34c-.24.83.64 1.54 1.4 1.13l9.05-4.87a.98.98 0 0 0 0-1.72Z" />
        </svg>
    )
}

