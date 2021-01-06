import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript2'

const plugins = [
    typescript({
        tsconfig: 'tsconfig.json',
        removeComments: true,
        useTsconfigDeclarationDir: true,
    }),
    terser({
        include: ['re0.js'],
    }),
]

export default {
    input: 'src/index.ts',
    output: [
        { file: 'dist/re0.js', format: 'umd', name: 're0', sourcemap: true },
        { file: 'dist/re0.esm.js', format: 'esm', sourcemap: true },
    ],
    plugins,
}
