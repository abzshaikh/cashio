import { useMemo, useState } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { TagFormDialog } from './TagFormDialog';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import { useTags } from '../../hooks/useTags';
import { createTag, deleteTag, updateTag } from '../../services/tagService';
import type { TagFormValues } from '../../schemas/tagSchemas';
import type { Tag } from '../../types/tag';

type TagDialogState = { mode: 'create' } | { mode: 'edit'; tag: Tag } | null;

/**
 * Flat, no-subcategory sibling of `CategoriesSection` — a tag has no
 * hierarchy to expand into, so each one is just a colored `Chip`: clicking
 * it opens `TagFormDialog` to rename/recolor (mirroring how
 * `CategoriesSection`'s subcategory chips already use click-to-rename), and
 * its delete icon removes it, same "existing transactions keep showing the
 * plain name" wording `CategoriesSection` uses for a deleted category.
 */
export function TagsSection() {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const confirm = useConfirm();
  const { tags, error: loadError, reload } = useTags();

  const [tagDialog, setTagDialog] = useState<TagDialogState>(null);

  const existingSlugs = useMemo(() => (tags ?? []).map((t) => t.slug), [tags]);

  const handleSubmit = async (values: TagFormValues) => {
    if (!user) return;
    if (tagDialog?.mode === 'edit') {
      await updateTag(tagDialog.tag.id, values);
      success('Tag updated');
    } else {
      await createTag(user.uid, existingSlugs, values);
      success('Tag added');
    }
    setTagDialog(null);
  };

  const handleDelete = async (tag: Tag) => {
    const confirmed = await confirm({
      title: 'Delete tag?',
      message: `This deletes "${tag.name}". Existing transactions already tagged with it will keep showing "${tag.name}" as plain text, but you won't be able to pick it for new ones.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteTag(tag.id);
      success('Tag deleted');
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Failed to delete tag.');
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title="Tags"
        subheader="Label transactions to track them across categories and accounts."
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setTagDialog({ mode: 'create' })}
          >
            Add Tag
          </Button>
        }
      />
      <CardContent>
        {loadError && <ErrorState description={loadError.message} onRetry={reload} />}
        {!loadError && tags === null && <EmptyState title="Loading tags…" />}
        {!loadError && tags !== null && tags.length === 0 && (
          <EmptyState
            icon={<LocalOfferOutlinedIcon fontSize="inherit" />}
            title="No tags yet"
            description="Create a tag to label transactions — e.g. Vacation, Business, Reimbursable."
            actionLabel="Add Tag"
            onAction={() => setTagDialog({ mode: 'create' })}
          />
        )}
        {!loadError && tags !== null && tags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                color={tag.color}
                onClick={() => setTagDialog({ mode: 'edit', tag })}
                onDelete={() => handleDelete(tag)}
              />
            ))}
          </Stack>
        )}
      </CardContent>

      <TagFormDialog
        open={tagDialog !== null}
        mode={tagDialog?.mode ?? 'create'}
        initialValues={
          tagDialog?.mode === 'edit' ? { name: tagDialog.tag.name, color: tagDialog.tag.color } : undefined
        }
        onClose={() => setTagDialog(null)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
