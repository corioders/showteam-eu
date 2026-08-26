import { type ComponentProps, createElement, type FunctionComponent } from "react";

/**
 * Extract all of C’s keys except the ones from React.FC
 * (i.e. its "statics" only).
 */
type NonFCStatics<C> = Omit<C, keyof FunctionComponent<any>>;

export function bindComponentProps<
	ComponentT extends FunctionComponent<any>,
	BoundProps extends Partial<ComponentProps<ComponentT>>,
	BoundComponentT = FunctionComponent<Omit<ComponentProps<ComponentT>, keyof BoundProps>> & NonFCStatics<ComponentT>,
>(component: ComponentT, bindProps: BoundProps): BoundComponentT {
	const BoundComponent: FunctionComponent<Omit<ComponentProps<ComponentT>, keyof BoundProps>> = (props) => {
		// merge the bound props with the new props
		return createElement(component, {
			...bindProps,
			...props,
		} as ComponentProps<ComponentT>);
	};

	// copy over all statics
	Object.assign(BoundComponent, component);

	return BoundComponent as BoundComponentT;
}
