import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import SvgModel from '../../models/SvgModel';
import Operation from './Operation';

type DrawCompleteProp = {
    target: SvgModel
    drawGroup: DrawGroup,
}

export default class DrawComplete extends Operation<DrawCompleteProp> {
    constructor(props: DrawCompleteProp) {
        super();
        this.state = {
            target: props.target,
            drawGroup: props.drawGroup
        };
    }

    public redo() {
        // this.state.drawGroup.startDraw(this.state.target.elem);
    }

    public undo() {
        this.state.drawGroup.startDraw(this.state.target.elem);
    }
}
