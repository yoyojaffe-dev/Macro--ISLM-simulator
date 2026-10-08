import { Component } from 'react';

/**
 * Contains a rendering failure to the component that caused it and shows the
 * error message in its place. `resetKey` clears the error when it changes
 * (e.g. when the user moves to another step).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[MacroLab] ${this.props.label}`, error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="rounded-xl border border-[#F4C7C3] bg-[#FEF3F2] p-4 text-[13px] leading-6 text-[#B42318]">
        <p className="font-bold">הרכיב &quot;{this.props.label}&quot; לא הצליח להיטען. שאר הסימולטור ממשיך לעבוד.</p>
        <p dir="ltr" className="mt-1 break-words text-left font-mono text-[11.5px]">
          {String(error?.message || error)}
        </p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-2 rounded-md border border-[#B42318] px-2 py-0.5 text-[12px] font-semibold hover:bg-white"
        >
          נסו שוב
        </button>
      </div>
    );
  }
}
