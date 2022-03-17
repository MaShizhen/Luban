import { createSVGElement } from '../../element-utils';
import { AttachPointRadius, Mode, pointRadius, pointSize, ThemeColor } from './constants';

class CursorGroup {
    public mode: Mode;

    public group: SVGGElement;

    private cursor: SVGSVGElement;

    private cursorPoint: SVGRectElement;

    private attachPoint: SVGCircleElement;

    private attachTip: SVGGElement;

    constructor() {
        this.init();
    }

    private init() {
        this.group = createSVGElement({
            element: 'g',
            attr: {
                id: 'cursorGroup',
                'visibility': 'hidden'
            }
        });
        this.group.append(this.getDefault());
        this.group.append(this.getCursorPoint());
        this.group.append(this.getAttachPoint());
        this.group.append(this.getAttachTip());
    }

    private getCursorPoint() {
        this.cursorPoint = createSVGElement({
            element: 'rect',
            attr: {
                fill: '',
                'fill-opacity': 1,
                width: pointSize,
                height: pointSize,
                rx: '0',
                ry: '0',
                stroke: ThemeColor
            }
        });
        return this.cursorPoint;
    }

    private getAttachPoint() {
        this.attachPoint = createSVGElement({
            element: 'circle',
            attr: {
                r: AttachPointRadius,
                stroke: 'black',
                'stroke-opacity': 0.5
            }
        });
        return this.attachPoint;
    }

    private getDefault() {
        const cursor: SVGSVGElement = createSVGElement({
            element: 'svg',
            attr: {
                width: '20',
                height: '20',
                viewBox: '0 0 30 30',
                fill: 'none'
            }
        });
        cursor.innerHTML = `
        <path fill-rule="evenodd" clip-rule="evenodd"
        d="M23.5153 20.7482L15.5274 25.36C15.5032 25.374 15.4728 25.3714 15.4513 25.3534L10.2199 20.9611C9.77617 20.5885 9.51581 20.0418 9.50625 19.4624L9.29584 6.7118C9.29544 6.68763 9.30818 6.66515 9.32911 6.65307L10.4141 6.02662C10.435 6.01458 10.4607 6.01474 10.4814 6.02703L21.3572 12.4842C21.8549 12.7797 22.2002 13.2763 22.3038 13.8457L23.5475 20.6786C23.5526 20.7063 23.5397 20.7341 23.5153 20.7482Z"
        stroke="#545659" />
        <path
            d="M14.4567 14.3853C13.8201 14.7528 13.602 15.5669 13.9695 16.2035C14.3371 16.8401 15.1511 17.0582 15.7877 16.6907C16.4243 16.3231 16.6425 15.5091 16.2749 14.8724C15.9074 14.2358 15.0933 14.0177 14.4567 14.3853Z"
            fill="#545659" />
        <path d="M15.1924 15.4975L10.201 6.85224" stroke="#545659" stroke-linecap="round" />
        <path d="M24.8867 23.0304L16.8178 27.689" stroke="#545659" stroke-linecap="round" />
        `;
        this.cursor = cursor;
        return this.cursor;
    }

    public getAttachTip() {
        this.attachTip = createSVGElement({
            element: 'g',
            attr: {
                visibility: 'hidden'
            }
        });
        this.attachTip.append(createSVGElement({
            element: 'path',
            attr: {
                stroke: 'red',
                d: ''
            }
        }));
        this.attachTip.append(createSVGElement({
            element: 'path',
            attr: {
                stroke: 'red',
                d: ''
            }
        }));
        return this.attachTip;
    }


    public update(leftKeyPressed: boolean, x: number, y: number) {
        if (this.mode !== Mode.DRAW) {
            return;
        }
        if (leftKeyPressed) {
            this.cursorPoint.setAttribute('x', (x - pointRadius).toString());
            this.cursorPoint.setAttribute('y', (y - pointRadius).toString());
            this.cursorPoint.setAttribute('rx', '0');
            this.cursorPoint.setAttribute('ry', '0');
        } else {
            this.cursorPoint.setAttribute('x', (x - pointRadius).toString());
            this.cursorPoint.setAttribute('y', (y - pointRadius).toString());
            this.cursorPoint.setAttribute('rx', pointRadius.toString());
            this.cursorPoint.setAttribute('ry', pointRadius.toString());
        }

        this.cursorPoint.setAttribute('fill', '');
        this.cursor.setAttribute('x', (x - 6.5).toString());
        this.cursor.setAttribute('y', (y - 4).toString());
    }

    public toogleVisible(visible: boolean) {
        this.group.setAttribute('visibility', visible ? 'visible' : 'hidden');
    }

    public isClosedLoop() {
        return this.attachPoint.getAttribute('visibility') === 'visible';
    }

    public setAttachPoint(x?: number, y?: number) {
        if (this.mode !== Mode.DRAW) {
            return;
        }
        if (x && y) {
            this.attachPoint.setAttribute('cx', (x + 13).toString());
            this.attachPoint.setAttribute('cy', (y + 8).toString());
            this.attachPoint.setAttribute('visibility', 'visible');

            const r = pointSize / 2 - 1;
            const paths = [
                `M ${x - r} ${y - r} L ${x + r} ${y + r}`,
                `M ${x - r} ${y + r} L ${x + r} ${y - r}`,
            ];
            Array.from(this.attachTip.children).forEach((elem, index) => {
                elem.setAttribute('d', paths[index]);
            });
            this.attachTip.setAttribute('visibility', 'visible');
        } else {
            this.attachPoint.setAttribute('visibility', 'hidden');
            this.attachTip.setAttribute('visibility', 'hidden');
        }
    }


    public keyDown() {
        this.cursorPoint.setAttribute('fill', ThemeColor);
    }
}

export default CursorGroup;
