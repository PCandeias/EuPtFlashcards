import Root from './Root.svelte'
import { mount } from 'svelte'

export default mount(Root, { target: document.getElementById('app')! })
