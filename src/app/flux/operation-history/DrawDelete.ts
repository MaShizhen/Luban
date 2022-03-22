import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import Operation from './Operation';

type DrawDeleteProp = {
    target: {
        elem: SVGPathElement,
        closedLoop: boolean
    }[]
    drawGroup: DrawGroup,
}

export default class DrawDelete extends Operation<DrawDeleteProp> {
    constructor(props: DrawDeleteProp) {
        super();
        this.state = {
            target: props.target,
            drawGroup: props.drawGroup
        };
    }

    public redo() {
        this.state.target.forEach(line => {
            this.state.drawGroup.deleteLine(line.elem);
        });
    }

    public undo() {
        this.state.target.forEach(line => {
            this.state.drawGroup.appendLine(line.elem, line.closedLoop);
        });
    }
}
