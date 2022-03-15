import type ContentGroup from '../../ui/SVGEditor/svg-content/SVGContentGroup';
import Operation from './Operation';

type DrawStartProp = {
    ele: string;
    contentGroup: ContentGroup;
}

export default class DrawStart extends Operation<DrawStartProp> {
    constructor(props: DrawStartProp) {
        super();
        this.state = {
            ele: props.ele,
            contentGroup: props.contentGroup,
        };
    }

    public redo() {
        this.state.contentGroup.drawGroup.stopDraw(true);
        // this.state.contentGroup.onChangeMode('draw');
        this.state.contentGroup.drawGroup.startDraw(this.state.ele);
    }

    public undo() {
        this.state.contentGroup.drawGroup.stopDraw(true);
        this.state.contentGroup.onChangeMode('select');
    }
}
