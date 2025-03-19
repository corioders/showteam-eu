interface Props {
	error: Error | string;
}
export default function CstdError(props: Props) {
	return (
		<div>
			<h1 className="font-extrabold">ERROR:</h1>
			<p className="whitespace-pre-wrap break-words">{String(props.error)}</p>
		</div>
	);
}
