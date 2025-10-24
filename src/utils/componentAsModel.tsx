import ReactDOM from "react-dom";

export default function ComponentAsModel(Component: React.ReactNode) {

    return ReactDOM.createPortal(
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999
            }}
        >
            <div onClick={(e) => e.stopPropagation()}>
                {Component}
            </div>
        </div>
        , document.body
    )
}