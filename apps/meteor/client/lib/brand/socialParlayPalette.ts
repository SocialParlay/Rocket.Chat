import type { Themes } from '@rocket.chat/fuselage';

/**
 * Social Parlay brand palette, expressed as overrides of the Fuselage
 * `--rcx-color-*` tokens. Only tokens that carry brand meaning (surfaces,
 * strokes, text, primary/secondary buttons, badges) are listed; semantic
 * colors such as danger, success and warning keep the Fuselage defaults.
 *
 * Source of truth for the values: docs/features/socialparlay-branding.md
 */

type PaletteOverrides = Record<string, string>;

const brand = {
	navy950: '#070b16',
	navy900: '#0a0f1e',
	navy800: '#0f1624',
	navy700: '#151b2e',
	navy600: '#1e2740',
	navy500: '#2b3a5c',
	navy400: '#3c4c6e',
	ink: '#f1f5f9',
	ink2: '#c9d3df',
	ink3: '#a3b0bd',
	mute: '#8593a6',
	mute2: '#5b6b83',
	teal: '#1f5d7a',
	tealLight: '#276f91',
	tealBright: '#3a8db5',
	tealDark: '#194b63',
	tealDeep: '#133a4d',
	tealTintDark: '#123544',
	tealTintLight: '#bfd6e0',
	tealHalo: '#cfe4ee',
	tealOnLight: '#1b536c',
	linkOnDark: '#4fb3e0',
	gold: '#d7b95c',
	goldDark: '#b08e42',
	white: '#ffffff',
	cloud50: '#f8fafc',
	cloud100: '#f1f4f7',
	cloud200: '#e8ecf0',
	cloud300: '#dde3ea',
	cloud400: '#c5cdd8',
	cloud500: '#94a3b8',
	slate: '#64748b',
	slateDeep: '#4b5b7a',
	inkLight: '#131a2b',
	inkLightStrong: '#080b12',
} as const;

const secondaryButtons = (defaultBg: string, hover: string, press: string, disabled: string): PaletteOverrides => ({
	'button-background-secondary-default': defaultBg,
	'button-background-secondary-hover': hover,
	'button-background-secondary-press': press,
	'button-background-secondary-focus': defaultBg,
	'button-background-secondary-keyfocus': defaultBg,
	'button-background-secondary-disabled': disabled,
	'button-background-secondary-danger-default': defaultBg,
	'button-background-secondary-danger-hover': hover,
	'button-background-secondary-danger-press': press,
	'button-background-secondary-danger-focus': defaultBg,
	'button-background-secondary-danger-keyfocus': defaultBg,
	'button-background-secondary-danger-disabled': disabled,
});

const primaryButtons = (defaultBg: string, hover: string, press: string, disabled: string): PaletteOverrides => ({
	'button-background-primary-default': defaultBg,
	'button-background-primary-hover': hover,
	'button-background-primary-press': press,
	'button-background-primary-focus': defaultBg,
	'button-background-primary-keyfocus': defaultBg,
	'button-background-primary-disabled': disabled,
	'button-font-on-primary': brand.white,
});

export const light: PaletteOverrides = {
	'surface-light': brand.white,
	'surface-tint': brand.cloud50,
	'surface-room': brand.white,
	'surface-neutral': brand.cloud200,
	'surface-disabled': brand.cloud100,
	'surface-hover': brand.cloud100,
	'surface-selected': brand.cloud300,
	'surface-dark': brand.navy900,
	'surface-featured': brand.tealOnLight,
	'surface-featured-hover': brand.tealDark,
	'surface-sidebar': brand.navy900,
	'surface-overlay': 'rgba(10, 15, 30, 0.5)',

	'stroke-extra-light': '#e1e6eb',
	'stroke-light': brand.cloud400,
	'stroke-medium': brand.cloud500,
	'stroke-dark': brand.slate,
	'stroke-extra-dark': brand.inkLight,
	'stroke-extra-light-highlight': brand.tealHalo,
	'stroke-highlight': brand.tealOnLight,

	'font-disabled': brand.cloud500,
	'font-annotation': brand.slate,
	'font-hint': brand.slateDeep,
	'font-secondary-info': brand.slateDeep,
	'font-default': brand.inkLight,
	'font-titles-labels': brand.inkLightStrong,
	'font-info': brand.tealOnLight,

	...primaryButtons(brand.tealOnLight, brand.tealDark, brand.tealDeep, brand.tealTintLight),
	'button-font-on-primary-disabled': brand.white,
	...secondaryButtons(brand.cloud200, brand.cloud300, brand.cloud400, brand.cloud100),
	'button-font-on-secondary': brand.inkLightStrong,
	'button-font-on-secondary-disabled': brand.cloud500,

	'badge-background-level-0': brand.cloud300,
	'badge-background-level-1': brand.slate,
	'badge-background-level-2': brand.tealOnLight,

	'status-bullet-away': brand.goldDark,
};

export const dark: PaletteOverrides = {
	'surface-light': brand.navy800,
	'surface-tint': brand.navy900,
	'surface-room': brand.navy900,
	'surface-neutral': brand.navy700,
	'surface-disabled': '#0d1322',
	'surface-hover': brand.navy950,
	'surface-selected': brand.navy600,
	'surface-dark': brand.ink,
	'surface-featured': brand.teal,
	'surface-featured-hover': brand.tealLight,
	'surface-sidebar': brand.navy950,
	'surface-overlay': 'rgba(3, 6, 14, 0.65)',

	'stroke-extra-light': '#172136',
	'stroke-light': brand.navy600,
	'stroke-medium': brand.navy500,
	'stroke-dark': '#7c8aa5',
	'stroke-extra-dark': brand.ink2,
	'stroke-extra-light-highlight': brand.tealHalo,
	'stroke-highlight': brand.tealBright,

	'font-disabled': brand.mute2,
	'font-annotation': brand.mute,
	'font-hint': brand.mute,
	'font-secondary-info': brand.ink3,
	'font-default': brand.ink2,
	'font-titles-labels': brand.ink,
	'font-info': brand.linkOnDark,

	...primaryButtons(brand.teal, brand.tealLight, brand.tealDark, brand.tealTintDark),
	'button-font-on-primary-disabled': brand.mute,
	...secondaryButtons(brand.navy700, brand.navy600, brand.navy500, '#0d1322'),
	'button-font-on-secondary': brand.ink,
	'button-font-on-secondary-disabled': brand.mute2,

	'badge-background-level-0': brand.navy600,
	'badge-background-level-1': brand.navy400,
	'badge-background-level-2': brand.tealLight,

	'status-bullet-away': brand.gold,
};

/**
 * The sidebar sits one step darker than dark-mode content so the two read as
 * separate planes, the way the product's navigation sits against its pages.
 */
export const sidebar: PaletteOverrides = {
	...dark,
	'surface-tint': brand.navy950,
	'surface-sidebar': brand.navy900,
	'surface-hover': brand.navy800,
	'surface-selected': brand.navy600,
};

export const getBrandPalette = (theme: Themes | 'sidebar'): PaletteOverrides | undefined => {
	switch (theme) {
		case 'light':
			return light;
		case 'dark':
			return dark;
		case 'sidebar':
			return sidebar;
		default:
			return undefined;
	}
};

export const toPaletteCss = (values: PaletteOverrides, selector: string, prefix = '--rcx-color'): string =>
	`${selector} {\n${Object.entries(values)
		.map(([name, color]) => `${prefix}-${name}: ${color};`)
		.join('\n')}\n}`;
