function tokenizer(input) {
    const tokens = []
    let current = 0

    while(current < input.length) {
        let char = input[current]

        if(char === '(') {
            tokens.push({
                token: 'parentheses',
                value: '('
            })

            current++ 

            continue
        }

        if(char === ')') {
            tokens.push({
                token: 'parentheses',
                value: ')'
            })

            current++

            continue
        }

        const whiteSpace = /\s/
        if(whiteSpace.test(char)) {
            current++
            continue
        }

        const numberPattern = /[0-9]/
        if(numberPattern.test(char)) {
            let value = ""

            while(numberPattern.test(char)) {
                value += char
                char = input[++current]
            }
            tokens.push({
                token: 'number',
                value
            })

            continue
        }

        if(char === '"') {
            let value = ''

            char = input[++current]
            while(char !== '"') {
                value += char
                char = input[++current]
            }

            tokens.push({
                token: 'string',
                value
            })

            current++

            continue
        }

        const letterPattern = /[a-zA-Z\.]/
        if(letterPattern.test(char)) {
            let value = ''

            while(letterPattern.test(char)) {
                value += char
                char = input[++current]
            }

            tokens.push({
                token: 'operator',
                value
            })
            continue
        }

        throw new TypeError('输入字符不合法')
    }

    return tokens
}


// console.log(tokenizer('(add 1  (ccc "ddd" "123"))'))
// console.log(tokenizer('(console 1)'))
// console.log(JSON.stringify(parser(tokenizer('(add 1  (ccc "ddd" "123"))'))))


function parser(tokens) {
    let current = 0
    
    function walk() {
        let token = tokens[current]

        if(token.token === 'number') {
            current++

            return {
                type: 'NumberLiteral',
                value: token.value
            }
        }

        if(token.token === 'string') {
            current++

            return {
                type: 'StringLiteral',
                value: token.value
            }
        }

        if(token.token === 'parentheses' &&
            token.value === '(') {
            token = tokens[++current]

            const value = {
                type: 'CallExpression',
                name: token.value,
                params: []
            }

            token = tokens[++current]

            while(
                (token.token !== 'parentheses') ||
                (token.token === 'parentheses' && token.value !== ')')
            ) {
                value.params.push(walk())
                token = tokens[current]
            }

            current++
            return value
        }

        throw new TypeError('dont know type appear')
    }

    const program = {
        type: 'Program',
        body: []
    }

    while(current < tokens.length) {
        program.body.push(walk())
    }

    return program
}

function traverse(ast, visitor) {
    function traverseArray(array, parent) {
        array.forEach(item => {
            traverseNode(item, parent)
        })
    }

    function traverseNode(node, parent) {
        const method = visitor[node.type]

        method && method.enter && method.enter(node, parent)

        switch(node.type) {
            case 'Program':
                traverseArray(node.body, node)
                break
            case 'CallExpression':
                traverseArray(node.params, node)
                break
            case 'NumberLiteral':
                break
            case 'StringLiteral':
                break
            default:
                throw new TypeError(node.type);
        }

        method && method.exit && method.exit(node, parent)
    }

    traverseNode(ast, null)
}

// const ast = parser(tokenizer('(add 1  (ccc "ddd" "123"))'))
// const visitor = {
//     Program: {
//         enter(node, parent) {
//             console.log('Program enter node', node.name)
//             console.log('Program enter parent', parent)
//         },
//         exit(node, parent) {
//             console.log('Program exit node', node.name)
//             console.log('Program exit parent', parent)
//         }
//     },
//     CallExpression: {
//         enter(node, parent) {
//             console.log('CallExpression enter node', node.name)
//             console.log('CallExpression enter parent', parent && parent.name || (parent && parent.type))
//         },
//         exit(node, parent) {
//             console.log('CallExpression exit node', node.name)
//             console.log('CallExpression exit parent', parent && parent.name || (parent && parent.type))
//         }
//     },
//     NumberLiteral: {
//         enter(node, parent) {
//             console.log('NumberLiteral enter node', node.value)
//             console.log('NumberLiteral enter parent', parent.name)
//         },
//         exit(node, parent) {
//             console.log('NumberLiteral exit node', node.value)
//             console.log('NumberLiteral exit parent', parent.name)
//         }
//     },
//     StringLiteral: {
//         enter(node, parent) {
//             console.log('StringLiteral enter node', node.value)
//             console.log('StringLiteral enter parent', parent.name)
//         },
//         exit(node, parent) {
//             console.log('StringLiteral exit node', node.value)
//             console.log('StringLiteral exit parent', parent.name)
//         }
//     }
// }
// traverse(ast, visitor)


function transformer(ast) {
    const newAst = {
        type: 'Program',
        body: []
    }

    ast._context = newAst.body

    traverse(ast, {
        NumberLiteral: {
            enter(node, parent){
                parent._context.push({
                    type: 'NumberLiteral',
                    value: node.value
                })
            }
        },
        StringLiteral: {
            enter(node, parent) {
                parent._context.push({
                    type: 'StringLiteral',
                    value: node.value
                })
            }
        },
        CallExpression: {
            enter(node, parent) {
                
                let expression = {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: node.name
                    },
                    arguments: []
                }

                node._context = expression.arguments

                if(parent.type !== 'CallExpression') {
                    expression = {
                        type: 'ExpressionStatement',
                        expression
                    }
                }

                parent._context.push(expression)
            }
        }
    })

    return newAst
}

// console.log(JSON.stringify(transformer(parser(tokenizer('(add 1  (ccc "ddd" "123"))')))));

function codeGenerator(node) {

    switch(node.type) {
        case 'Program': 
            return node.body.map(codeGenerator).join('\n')
        case 'ExpressionStatement':
            return codeGenerator(node.expression) + ';'
        case 'CallExpression':
            return codeGenerator(node.callee) + '(' + node.arguments.map(codeGenerator) + ')'
        case 'Identifier':
            return node.name
        case 'NumberLiteral':
            return node.value
        case 'StringLiteral':
            return node.value
        default:
            throw new TypeError('dont know type')
    }

}

function add(a, b) {
    return a + b
}
// console.log(codeGenerator(transformer(parser(tokenizer('(add 1  (ccc "ddd" "123"))')))));
console.log(codeGenerator(transformer(parser(tokenizer('(console.log 1 )')))));
console.log(eval(codeGenerator(transformer(parser(tokenizer('(add 1 2)'))))))
