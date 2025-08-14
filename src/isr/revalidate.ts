import { StatusCodes } from "http-status-codes";
import { revalidatePath } from "next/cache";

export function revalidateRoute(revalidatePathString: string, setRevalidateToken: string, revalidateTokenURLParameterName: string): (request: Request) => Response {
	return (request: Request): Response => {
		const requestUrl = new URL(request.url);

		const revalidateToken = requestUrl.searchParams.get(revalidateTokenURLParameterName);
		if (revalidateToken === null) {
			return new Response(`Error: ${revalidateTokenURLParameterName} search parameter not provided.`, { status: StatusCodes.UNAUTHORIZED });
		}

		if (revalidateToken !== setRevalidateToken) {
			return new Response(`Error: ${revalidateTokenURLParameterName} invalid.`, { status: StatusCodes.UNAUTHORIZED });
		}

		// TODO: Make this path dynamic, and make revalidate part of cstd-lib
		revalidatePath(revalidatePathString);
		return new Response(null, { status: StatusCodes.OK });
	};
}
