# LLL SHA1

For background on LLL see [here](https://github.com/benjaminion/LLL_erc20#introduction). Documentation is [here](http://lll-docs.readthedocs.io/en/latest/index.html).

To achieve "close to the metal" EVM performance, Solidity programmers will sometimes reach for assembly language. This is designed to take away the worst of the pain of stack management and jump management while avoiding the overheads of high level languages.

The premise of LLL is that it is similarly able to achieve near-native code performance, with the advantage over assembly language of providing a powerful macro capability that can dramatically improve code readability and maintainability.

As an exercise in exploring and comparing these approaches, I've translated Nick Johnson's [Solidity SHA1](https://github.com/Arachnid/solsha1) assembly code to LLL. It's essentially a one-to-one transposition.

## Readability

This is obviously quite subjective! On balance, I feel that the readability of the Solidity code and the readability of the LLL code are fairly similar.

I didn't find much opportunity for vast simplifications using LLL macros in the SHA1 code, but the use of macros for `shr`, `shl` and `offneg` in particular does simplify some of the more complex expressions.

Example of the use of the custom `offneg` macro:

Solidity:

    let temp := xor(xor(mload(sub(j, 12)), mload(sub(j, 32))), xor(mload(sub(j, 56)), mload(sub(j, 64))))

LLL:

    [_t]:(^ (offneg _j 12) (offneg _j 32) (offneg _j 56) (offneg _j 64))

Example of the use of the `shr` macro:

Solidity:

    f := xor(div(x, exp(2, 120)), div(x, exp(2, 80)))
    f := xor(div(x, exp(2, 40)), f)

LLL:

    [_f]:(^ (shr 120 @_x) (shr 80 @_x) (shr 40 @_x))


After [EIP-145](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-145.md) is implemented, the Solidity code could be rewritten to use native `shl` and `shr` opcodes. In LLL `shl` and `shr` are implemented as macros. When the time comes, the macros can just be removed without touching the rest of the code, since most EVM opcodes automatically become LLL expressions when they are implemented.

The snippets above showcase another feature of LLL: many of the [arithmetic operators](http://lll-docs.readthedocs.io/en/latest/lll_reference.html#multi-ary) are "multi-ary", meaning that with one expression you can perform a string of operations in succession, such as the multi-ary xor, `^`, above. This makes more effective use of the stack than going through intermediate memory variables, and is easier to read in general.

Another example of this, using the multi-ary or operator, `|`.

Solidity:

    h := or(or(or(or(and(div(h, exp(2, 32)), 0xFFFFFFFF00000000000000000000000000000000), and(div(h, exp(2, 24)), 0xFFFFFFFF000000000000000000000000)), and(div(h, exp(2, 16)), 0xFFFFFFFF0000000000000000)), and(div(h, exp(2, 8)), 0xFFFFFFFF00000000)), and(h, 0xFFFFFFFF))

LLL:

    [0]:(|
          (and (shr 32 @_h) 0xFFFFFFFF00000000000000000000000000000000)
          (and (shr 24 @_h) 0xFFFFFFFF000000000000000000000000)
          (and (shr 16 @_h) 0xFFFFFFFF0000000000000000)
          (and (shr 8 @_h) 0xFFFFFFFF00000000)
          (and @_h 0xFFFFFFFF))

This is nice, but on the whole, the improvements in readability are relatively minor. Both sets of code end up looking fairly similar (loads of brackets!).  But make your own mind up.

## Performance

It's never going to be easy to outperform hand-rolled assembly with a compiled language. How does LLL do?

With the 123 character test string I happened to be using, the gas usage is as follows:

  * Solidity: 205740 gas.
  * LLL: 205740 gas.

Yep, not a typo - gas usage is identical. This was pleasing :-)

For a wider range of tests, the results are as follows.

| Code type     | 1 byte | 123 bytes | 854 bytes | Per 512 bits |
|---------------|--------|-----------|-----------|--------------|
| LLL           | 80780  | 205740    | 897639    | 62.7k        |
| Solidity      | 80736  | 205740    | 897972    | 62.8k        |
| LLL (opt)     | 64582  | 157342    | 672141    | 46.6k        |
| Solidity (opt)| 56254  | 132516    | 556667    | 38.4k        |
| Overhead      | 21542  | 29838     | 79610     |              |

Compiler versions,
  * solc: 0.4.19-develop.2017.10.27+commit.59d4dfbd.Linux.g++
  * lllc: 0.4.19-develop.2017.10.27+commit.59d4dfbd.Linux.g++

The "per 512 bit block" figures are simply the difference between a run with 128 bytes of input and a run with 64 bytes of input.

The "overhead" line is the unavoidable cost of (1) 21000 gas for the contract call, plus (2) the cost of the call data transfer - roughly 474 + N * 68 gas, where N is the length in bytes of the test string. This overhead is the same for all the contracts.

### Observations

  1. The LLL code is a little faster for longer input texts. This is likely due to the better use of stack to store intermediate values in the inner loop. The Solidity assembly code could be restructured a little to match this.
  2. The Solidity code is fractionally faster for very short input texts.
  3. The optimiser is extremely effective in improving the performance of the codes, but more so in the case of Solidity.

On point 3., the main work of the optimiser is to subsitute all the `exp` expressions with constants. `exp` is quite expensive, so this substitution has a dramatic effect.  In the case of Solidity, the optimser removes all of the 29 `exp`s in the main body; in the case of LLL it removes 24 but leaves 5, a couple of them in the inner loop. Hand optimising these five confirms that they largely account for the performance difference. I don't know why the optimiser is less aggressive on code produced by LLL - it's the same optimiser for both.

These gains are, however, quite temporary. Every one of the `exp` operations in the code is used in performing a bitwise-shift operation. These operations will soon be vastly cheaper, and the optimiser will struggle to find such savings. Of course, we could also do this optimisation - replacing `exp`s with constants - by hand; LLL's macro system would make it reasonably pretty. But I've resisted doing this for a fair comparison with the existing Solidity version.

## Conclusions

  * The LLL code is no worse than the Solidity assembly code, and in some minor respects better.
  * The unoptimised LLL performance is no worse than the unoptimised Solidity assembly code, and a little better for large inputs.
  * It would definitely be good to revisit this exercise once EIP-145 is deployed. There should be a huge performance improvement for both codes.
  * It would be excellent if LLL were available as an alternative to inline assembly within Solidity contracts. I don't think this would be *too* hard to implement.

