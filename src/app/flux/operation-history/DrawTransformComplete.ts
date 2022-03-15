import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import Operation from './Operation';

type DrawTransformCompleteProp = {
    before: string,
    after: string,
    drawGroup: DrawGroup,
    target: SVGPathElement
}

export default class DrawTransformComplete extends Operation<DrawTransformCompleteProp> {
    constructor(props: DrawTransformCompleteProp) {
        super();
        this.state = {
            target: props.target,
            before: props.before,
            after: props.after,
            drawGroup: props.drawGroup
        };
    }

    public redo() {
        this.state.target.setAttribute('d', this.state.after);
        this.state.target.setAttribute('source', this.state.after);
        const { x, y, width, height } = this.state.target.getBBox();
        this.state.target.setAttribute('x', (x + width / 2).toString());
        this.state.target.setAttribute('y', (y + height / 2).toString());


        // this.getSVGModelByElement(element).onTransform();
    }

    public undo() {
        this.state.target.setAttribute('d', this.state.before);
        this.state.target.setAttribute('source', this.state.before);
        const { x, y, width, height } = this.state.target.getBBox();
        this.state.target.setAttribute('x', (x + width / 2).toString());
        this.state.target.setAttribute('y', (y + height / 2).toString());

        // this.getSVGModelByElement(element).onTransform();
    }
}
