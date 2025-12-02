# Contributing to Ignitera GTM Command Center

Thank you for your interest in contributing to Ignitera GTM Command Center! We welcome contributions from the community to help make this project better.

## 🤝 How to Contribute

### Reporting Issues

If you find a bug or have a feature request:

1. **Check Existing Issues**: Search [existing issues](https://github.com/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/issues) to avoid duplicates
2. **Create a New Issue**: If your issue is new, open an issue with:
   - Clear, descriptive title
   - Detailed description of the problem or feature
   - Steps to reproduce (for bugs)
   - Expected vs. actual behavior
   - Environment details (OS, Node version, browser)
   - Screenshots or error logs (if applicable)

### Suggesting Enhancements

We're open to new ideas! When suggesting enhancements:

- Explain the use case and why it would benefit users
- Provide examples of how it would work
- Consider how it fits with the existing architecture
- Be open to discussion and feedback

## 🚀 Development Workflow

### Getting Started

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Ignitera-GTM-Command-Center-by-Symtri.git
   cd Ignitera-GTM-Command-Center-by-Symtri
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.local.example .env.local
   # Add your API keys to .env.local
   ```

4. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

### Making Changes

1. **Write Clean Code**
   - Follow existing code style and patterns
   - Use TypeScript types consistently
   - Add JSDoc comments for complex functions
   - Keep functions small and focused

2. **Add Tests**
   ```bash
   # Run tests
   npm test
   
   # Run tests with UI
   npm run test:ui
   
   # Check coverage
   npm run test:coverage
   ```
   
   - Add tests for new features
   - Ensure existing tests pass
   - Aim for good test coverage

3. **Type Check**
   ```bash
   npx tsc --noEmit
   ```
   
   - Fix all TypeScript errors
   - Ensure strict mode compliance

4. **Test Locally**
   ```bash
   npm run dev
   ```
   
   - Test your changes in the browser
   - Verify all affected features work
   - Test edge cases

### Commit Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format: <type>(<scope>): <description>

# Examples:
git commit -m "feat(leads): add bulk import functionality"
git commit -m "fix(voice): resolve audio context issues"
git commit -m "docs(readme): update installation steps"
git commit -m "test(gemini): add error handling tests"
git commit -m "refactor(pipeline): simplify stage transitions"
git commit -m "chore(deps): update vitest to v4.0.15"
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `style`: Formatting, missing semicolons, etc.
- `chore`: Maintenance tasks, dependencies
- `perf`: Performance improvements

### Submitting a Pull Request

1. **Push Your Changes**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Clear description of changes
     - Related issue numbers (if applicable)
     - Testing performed
     - Screenshots (if UI changes)

3. **PR Checklist**
   - [ ] Code follows project style guidelines
   - [ ] All tests pass (`npm test`)
   - [ ] TypeScript compilation succeeds (`npx tsc --noEmit`)
   - [ ] New tests added for new features
   - [ ] Documentation updated (if needed)
   - [ ] Commits follow conventional commit format
   - [ ] PR description is clear and complete

4. **Review Process**
   - Maintainers will review your PR
   - Address any requested changes
   - Keep discussion professional and constructive
   - Be patient - reviews take time

## 📋 Code Style Guidelines

### TypeScript

```typescript
// ✅ Good: Clear types, descriptive names
interface LeadEnrichmentParams {
  lead: Lead;
  startup: Startup;
  icp: ICPProfile | null;
}

export const enrichLead = async (
  params: LeadEnrichmentParams
): Promise<Partial<Lead>> => {
  // Implementation
};

// ❌ Bad: Implicit any, unclear types
export const enrichLead = async (lead, startup, icp) => {
  // Implementation
};
```

### React Components

```typescript
// ✅ Good: Typed props, clear interface
interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
}

const LeadDetail: React.FC<LeadDetailProps> = ({ 
  lead, 
  onClose, 
  onUpdate 
}) => {
  // Implementation
};

// ❌ Bad: Untyped props
const LeadDetail = ({ lead, onClose, onUpdate }) => {
  // Implementation
};
```

### Error Handling

```typescript
// ✅ Good: Descriptive errors
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error("API call failed:", error);
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Unknown error occurred';
  throw new Error(`Failed to fetch data: ${errorMessage}`);
}

// ❌ Bad: Silent failures or re-throwing raw errors
try {
  return await apiCall();
} catch (error) {
  throw error;
}
```

## 🧪 Testing Guidelines

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  describe('functionName', () => {
    it('should handle valid input correctly', () => {
      const result = functionName(validInput);
      expect(result).toBe(expectedOutput);
    });
    
    it('should throw error for invalid input', () => {
      expect(() => functionName(invalidInput)).toThrow();
    });
  });
});
```

### Integration Tests

- Test component interactions
- Mock external dependencies (API calls, Supabase)
- Verify UI state changes

## 🏗️ Project Architecture

### Directory Structure

```
├── components/         # React components
│   ├── Auth.tsx       # Authentication
│   ├── LeadDetail.tsx # Lead management
│   └── ...
├── services/          # Backend services
│   ├── gemini.ts     # AI/Gemini integration
│   ├── supabase.ts   # Database client
│   └── voice_tools.ts # Voice assistant
├── __tests__/        # Test files
├── types.ts          # TypeScript type definitions
└── index.tsx         # Main application
```

### Key Patterns

- **Services Layer**: All external API calls go through service modules
- **Type Safety**: Use TypeScript interfaces for all data structures
- **Error Handling**: Catch errors at service layer, provide user-friendly messages
- **State Management**: React hooks for local state
- **Testing**: Vitest for unit/integration tests

## 🔒 Security

### Reporting Security Issues

**Do NOT open public issues for security vulnerabilities.**

Instead:
1. Email security details to [your-security-email]
2. Include detailed steps to reproduce
3. Wait for acknowledgment before public disclosure

### Security Best Practices

- Never commit API keys or credentials
- Use environment variables for sensitive data
- Validate all user inputs
- Sanitize data before displaying
- Follow OWASP security guidelines

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License (same as the project).

## 💬 Community

- **Questions?** Open a [Discussion](https://github.com/aguillen06/Ignitera-GTM-Command-Center-by-Symtri/discussions)
- **Need Help?** Check existing issues or create a new one
- **Stay Updated**: Watch the repository for updates

## 🙏 Recognition

Contributors will be recognized in:
- Release notes
- Project documentation
- GitHub contributors list

Thank you for making Ignitera GTM Command Center better! 🚀

---

**Questions?** Contact the maintainers at [@aguillen06](https://github.com/aguillen06)
