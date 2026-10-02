import { PaletteStyleTag } from '@rocket.chat/fuselage';
import type { Themes } from '@rocket.chat/fuselage';
import { useMemo } from 'react';

import { getBrandPalette, toPaletteCss } from '../lib/brand/socialParlayPalette';

type BrandPaletteStyleTagProps = {
	theme: Themes | 'sidebar';
	selector: string;
	tagId: string;
};

/*
 * Every selector is anchored to `html` so the brand declarations outrank the
 * Fuselage ones for the same scope no matter which style tag lands later.
 */
const outrankFuselage = (selector: string): string =>
	selector
		.split(',')
		.map((part) => part.trim())
		.map((part) => (part.startsWith(':') ? `html${part}` : `html ${part}`))
		.join(', ');

/**
 * Layers the Social Parlay palette over the Fuselage palette injected by the
 * sibling `PaletteStyleTag` for the same scope. High-contrast mode keeps the
 * stock palette, since its colors are tuned for accessibility.
 */
const BrandPaletteStyleTag = ({ theme, selector, tagId }: BrandPaletteStyleTagProps) => {
	const palette = getBrandPalette(theme);
	const css = useMemo(() => palette && toPaletteCss(palette, outrankFuselage(selector)), [palette, selector]);

	if (!css) {
		return null;
	}

	return <PaletteStyleTag palette={css} tagId={tagId} />;
};

export default BrandPaletteStyleTag;
