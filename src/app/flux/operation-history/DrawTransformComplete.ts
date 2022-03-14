import type DrawGroup from '../../ui/SVGEditor/svg-content/DrawGroup';
import Operation from './Operation';
import { TransformRecord } from '../../ui/SVGEditor/svg-content/DrawGroup/DrawGroup';

type DrawTransformCompleteProp = {
    before: TransformRecord[],
    after: TransformRecord[],
    drawGroup: DrawGroup
}

export default class DrawTransformComplete extends Operation<DrawTransformCompleteProp> {
    constructor(props: DrawTransformCompleteProp) {
        super();
        this.state = {
            before: props.before,
            after: props.after,
            drawGroup: props.drawGroup
        };
    }

    public redo() {
        this.state.after.forEach(record => {
            record.line.updatePosition(record.points);
            record.line.updatePosition();
        });
    }

    public undo() {
        this.state.before.forEach(record => {
            record.line.updatePosition(record.points);
            record.line.updatePosition();
        });
    }
}
