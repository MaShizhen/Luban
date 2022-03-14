import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import Operation from './Operation';

type DrawLineProp = {
    target: SVGPathElement
    drawGroup: DrawGroup,
}

export default class DrawLine extends Operation<DrawLineProp> {
    constructor(props: DrawLineProp) {
        super();
        this.state = {
            target: props.target,
            drawGroup: props.drawGroup
        };
    }

    public redo() {
        this.state.drawGroup.appendLine(this.state.target);
        // this.state.drawGroup.setOperations();
    }

    public undo() {
        this.state.drawGroup.deleteLine([this.state.target]);
        // this.state.drawGroup.setOperations();
    }
}
