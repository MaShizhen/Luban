import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import Operation from './Operation';

type DrawDeleteProp = {
    target: SVGPathElement[]
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
            this.state.drawGroup.deleteLine(line);
        });
    }

    public undo() {
        this.state.target.forEach(line => {
            this.state.drawGroup.appendLine(line);
        });
    }
}
