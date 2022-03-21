import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import Operation from './Operation';

type DrawTransformCompleteProp = {
    before: string,
    after: string,
    drawGroup: DrawGroup,
    elem: SVGPathElement
}

export default class DrawTransformComplete extends Operation<DrawTransformCompleteProp> {
    constructor(props: DrawTransformCompleteProp) {
        super();
        this.state = {
            elem: props.elem,
            before: props.before,
            after: props.after,
            drawGroup: props.drawGroup
        };
    }

    public redo() {
        this.state.elem.setAttribute('d', this.state.after);
        this.state.elem.setAttribute('source', this.state.after);
        const { x, y, width, height } = this.state.elem.getBBox();
        this.state.elem.setAttribute('x', `${x + width / 2}`);
        this.state.elem.setAttribute('y', `${y + height / 2}`);
    }

    public undo() {
        this.state.elem.setAttribute('d', this.state.before);
        this.state.elem.setAttribute('source', this.state.before);
        const { x, y, width, height } = this.state.elem.getBBox();
        this.state.elem.setAttribute('x', (x + width / 2).toString());
        this.state.elem.setAttribute('y', (y + height / 2).toString());
    }
}
